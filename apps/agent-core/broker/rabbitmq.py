"""
RabbitMQ Broker — Agent-Core Seite

Konsumiert Tasks aus den drei Prioritäts-Queues und publiziert
Ergebnisse zurück in agent.results.
"""

import asyncio
import json
from datetime import datetime, timezone
from typing import Callable, Awaitable
from uuid import uuid4

import aio_pika
from aio_pika import Message, DeliveryMode
from loguru import logger

from config import settings

QUEUES = {
    "HIGH":    "agent.tasks.high",
    "NORMAL":  "agent.tasks.normal",
    "LOW":     "agent.tasks.low",
    "RESULTS": "agent.results",
    "EVENTS":  "agent.events",
}

TaskHandler = Callable[[dict], Awaitable[dict]]


class RabbitMQBroker:
    def __init__(self):
        self._connection: aio_pika.abc.AbstractRobustConnection | None = None
        self._channel: aio_pika.abc.AbstractChannel | None = None
        self._handler: TaskHandler | None = None

    async def connect(self) -> None:
        self._connection = await aio_pika.connect_robust(
            settings.rabbitmq_url,
            reconnect_interval=5,
        )
        self._channel = await self._connection.channel()
        await self._channel.set_qos(prefetch_count=settings.rabbitmq_prefetch)

        # Alle Queues deklarieren
        for queue_name in QUEUES.values():
            await self._channel.declare_queue(queue_name, durable=True)

        logger.info("RabbitMQ verbunden: {}", settings.rabbitmq_url.split("@")[-1])

    async def start_consuming(self, handler: TaskHandler) -> None:
        """Startet den Consumer für alle Task-Queues (High, Normal, Low)."""
        self._handler = handler

        for key in ("HIGH", "NORMAL", "LOW"):
            queue = await self._channel.declare_queue(QUEUES[key], durable=True)
            await queue.consume(self._on_message)
            logger.info("Konsumiere Queue: {}", QUEUES[key])

    async def _on_message(self, message: aio_pika.abc.AbstractIncomingMessage) -> None:
        async with message.process(ignore_processed=True):
            try:
                task_data = json.loads(message.body.decode())
                logger.info(
                    "Task empfangen: {} (Agent: {})",
                    task_data.get("taskId", "?"),
                    task_data.get("agentName", "?"),
                )

                start_ms = _now_ms()
                result = await self._handler(task_data)
                duration_ms = _now_ms() - start_ms

                await self.publish_result({
                    "messageId": str(uuid4()),
                    "taskId":    task_data.get("taskId"),
                    "agentName": task_data.get("agentName"),
                    "success":   True,
                    "output":    result,
                    "durationMs": duration_ms,
                })
                logger.success("Task {} abgeschlossen in {}ms", task_data.get("taskId"), duration_ms)

            except Exception as exc:
                logger.error("Task-Fehler: {}", exc)
                task_data = json.loads(message.body.decode()) if message.body else {}
                await self.publish_result({
                    "messageId": str(uuid4()),
                    "taskId":    task_data.get("taskId"),
                    "agentName": task_data.get("agentName"),
                    "success":   False,
                    "error":     str(exc),
                    "durationMs": 0,
                })

    async def publish_result(self, result: dict) -> None:
        if not self._channel:
            return
        body = json.dumps(result).encode()
        await self._channel.default_exchange.publish(
            Message(
                body,
                delivery_mode=DeliveryMode.PERSISTENT,
                content_type="application/json",
            ),
            routing_key=QUEUES["RESULTS"],
        )

    async def broadcast_event(self, event: dict) -> None:
        if not self._channel:
            return
        body = json.dumps(event).encode()
        await self._channel.default_exchange.publish(
            Message(body, content_type="application/json"),
            routing_key=QUEUES["EVENTS"],
        )

    async def disconnect(self) -> None:
        if self._connection:
            await self._connection.close()


def _now_ms() -> int:
    return int(datetime.now(timezone.utc).timestamp() * 1000)


broker = RabbitMQBroker()
