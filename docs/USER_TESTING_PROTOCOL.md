# DiggAI User Testing Protocol

> **Comprehensive Testing Guide for Calm/Trust UI System**  
> **Version**: 1.0.0 | **Date**: 2026-03-24 | **Status**: Ready for Implementation

---

## Table of Contents

1. [Overview](#overview)
2. [Test Scenarios for Elderly Users](#test-scenarios-for-elderly-users)
3. [Test Scenarios for Anxious Users](#test-scenarios-for-anxious-users)
4. [Test Scenarios for RTL Users](#test-scenarios-for-rtl-users)
5. [Metrics to Track](#metrics-to-track)
6. [Survey Questions](#survey-questions)
7. [Testing Procedures](#testing-procedures)
8. [Data Collection Forms](#data-collection-forms)

---

## Overview

This protocol provides structured testing scenarios to validate the effectiveness of the Calm/Trust UI System across different user groups. Each scenario includes specific tasks, success criteria, and data collection points.

### User Groups

| Group | Characteristics | Focus Areas |
|-------|----------------|-------------|
| **Elderly Users (60+)** | Reduced vision, less tech experience | Font size, contrast, touch targets, simplicity |
| **Anxious Users** | High stress, medical anxiety | Calming colors, progress visibility, breathing exercises |
| **RTL Users** | Arabic/Persian speakers | Text direction, font rendering, layout mirroring |

### Testing Environment Requirements

- **Device**: Touchscreen tablet (iPad or Android, 10" minimum)
- **Browser**: Latest Chrome, Safari, or Firefox
- **Network**: Stable internet connection (simulate offline for resilience testing)
- **Accessibility Tools**: Screen reader (VoiceOver/NVDA), keyboard only

---

## Test Scenarios for Elderly Users

### Scenario 1: First-Time Registration

**Objective**: Evaluate onboarding clarity and form usability

**User Profile**: 
- Age: 65-75
- Tech experience: Minimal (uses smartphone for calls only)
- Vision: Mild presbyopia (uses reading glasses)

**Tasks**:

| Step | Task | Success Criteria | Time Limit |
|------|------|-----------------|------------|
| 1 | Find and tap "Neue Anamnese starten" | Button located and tapped within 30s | 60s |
| 2 | Enter name and date of birth | Both fields completed without errors | 120s |
| 3 | Select gender from options | Correct option selected | 30s |
| 4 | Review and confirm entries | User spots and corrects any errors | 60s |
| 5 | Submit form | Form submitted successfully | 30s |

**Observer Notes**:
- [ ] Did user struggle to read text?
- [ ] Were touch targets large enough?
- [ ] Did user use Simple Mode?
- [ ] Any confusion about form flow?
- [ ] Did user request help?

**Success Metrics**:
- Task completion rate: ≥90%
- Error rate per form: ≤2
- Average completion time: ≤5 minutes
- Help requests: ≤1 per session

---

### Scenario 2: Symptom Input with Voice

**Objective**: Test voice input as alternative to typing

**User Profile**:
- Age: 70+
- Motor skills: Arthritis (difficulty with precise touch)
- Preference: Voice over typing

**Tasks**:

| Step | Task | Success Criteria | Time Limit |
|------|------|-----------------|------------|
| 1 | Locate voice input button | Microphone icon found | 30s |
| 2 | Record symptom description | Audio captured and transcribed | 60s |
| 3 | Review transcription | User confirms accuracy | 45s |
| 4 | Edit if needed (or re-record) | Changes made successfully | 60s |

**Observer Notes**:
- [ ] Was voice button easily discoverable?
- [ ] Did transcription accuracy meet expectations?
- [ ] Did user prefer voice over typing?
- [ ] Any frustration with voice interface?

---

### Scenario 3: Simple Mode Evaluation

**Objective**: Determine if Simple Mode reduces cognitive load

**User Profile**:
- Age: 68
- Condition: Early-stage dementia (needs clear, single focus)

**Tasks**:

| Step | Task | Success Criteria |
|------|------|-----------------|
| 1 | Activate Simple Mode | Toggle found and activated |
| 2 | Complete 5 questions | All answered correctly |
| 3 | Navigate back to review | Previous answers accessible |
| 4 | Deactivate Simple Mode | Returns to standard view |

**Questions to Ask**:
1. "Which mode felt easier to use?"
2. "Did you feel less overwhelmed with one question at a time?"
3. "Would you use Simple Mode again?"

---

### Scenario 4: Font Size Adjustment

**Objective**: Validate font scaling preferences

**Tasks**:

| Step | Task | Expected Outcome |
|------|------|-----------------|
| 1 | Use default (18px) font | Baseline experience |
| 2 | Increase to large (20px) | Text visibly larger |
| 3 | Decrease to small (16px) | Text smaller but readable |
| 4 | Select preferred size | User makes active choice |

**Data to Collect**:
- Preferred font size (16px/18px/20px/22px)
- Reason for preference
- Comfort rating (1-5) for each size

---

## Test Scenarios for Anxious Users

### Scenario 1: Breathing Exercise Effectiveness

**Objective**: Measure anxiety reduction through biometric feedback

**User Profile**:
- Age: 35
- Condition: Generalized anxiety disorder
- Baseline: Heart rate 85-95 BPM, self-reported stress 7/10

**Setup**:
- Wearable heart rate monitor (Apple Watch, Fitbit, etc.)
- Pre-test anxiety questionnaire (GAD-7)

**Tasks**:

| Phase | Duration | Activity | Data Collection |
|-------|----------|----------|-----------------|
| Baseline | 2 min | Resting measurement | Heart rate, stress level |
| Pre-test | 5 min | Standard form completion | Heart rate, error rate |
| Breathing | 2 min | 4-7-8 breathing exercise | Heart rate change |
| Post-test | 5 min | Form completion | Heart rate, error rate |
| Recovery | 2 min | Resting measurement | Return to baseline |

**Metrics**:
- Heart rate reduction during breathing: ≥10 BPM
- Error rate improvement post-breathing: ≥30%
- Self-reported calmness increase: ≥2 points (1-10 scale)

**Observer Notes**:
- [ ] Did user voluntarily use breathing exercise?
- [ ] Was the exercise interface calming?
- [ ] Did user complete full 2-minute cycle?
- [ ] Any suggestions for improvement?

---

### Scenario 2: Progress Visibility Impact

**Objective**: Test if progress indicators reduce abandonment

**User Profile**:
- Age: 42
- Trait: High need for control, dislikes uncertainty

**Test Design**:
- Group A: Full progress indicators (step counter, percentage, time estimate)
- Group B: Minimal progress (percentage only)
- Group C: No progress indicator

**Tasks**:
Complete 20-question anamnesis form

**Metrics**:
- Completion rate by group
- Abandonment point (if applicable)
- Time spent per question
- Self-reported comfort level

**Hypothesis**: Group A will have highest completion rate and lowest abandonment.

---

### Scenario 3: Error Message Response

**Objective**: Compare anxiety levels with old vs. new error colors

**Test Design**:
- Version A: Traditional bright red errors (`#ef4444`)
- Version B: Calm/Trust soft coral (`#E07A5F`)

**Tasks**:
1. Intentionally submit incomplete form
2. Observe error message
3. Correct errors and resubmit

**Data Collection**:
- Heart rate spike upon error (wearable)
- Self-reported stress level (1-10)
- Time to recovery (resubmit)
- Facial expression analysis (if video permitted)

**Expected Outcome**:
- Version B: Lower heart rate spike, faster recovery

---

### Scenario 4: Color Psychology Validation

**Objective**: Measure trust and calmness ratings by color palette

**Test Design**:
Show users two versions of the same screen with different color schemes:
- Version A: Traditional clinical (white, bright blue, red alerts)
- Version B: Calm/Trust (warm beige, serene blue, soft coral)

**Survey Questions** (for each version):
1. "How trustworthy does this interface feel?" (1-10)
2. "How calming is this interface?" (1-10)
3. "Would you feel comfortable sharing personal health information?" (Yes/No/Maybe)
4. "Which version do you prefer?" (A/B/No preference)

---

## Test Scenarios for RTL Users

### Scenario 1: Arabic Language Navigation

**Objective**: Validate complete RTL experience

**User Profile**:
- Native language: Arabic
- Device: Android tablet with Arabic system language

**Tasks**:

| Step | Task | Success Criteria |
|------|------|-----------------|
| 1 | Open application | Interface automatically RTL |
| 2 | Read welcome message | Text flows right-to-left |
| 3 | Navigate to first question | Back button on right, forward on left |
| 4 | Select options | Radio buttons align right |
| 5 | Review progress | Progress bar fills right-to-left |

**Validation Checklist**:
- [ ] Noto Sans Arabic font loaded correctly
- [ ] No text truncation or overflow
- [ ] Icons properly mirrored (where applicable)
- [ ] Date format localized (DD/MM/YYYY)
- [ ] Numbers display in Arabic numerals or Eastern Arabic

---

### Scenario 2: Mixed Language Content

**Objective**: Test handling of mixed Arabic/Latin text

**Content Example**:
"ألم في الظهر (Rückenschmerzen) مع حمى (Fieber)"

**Tasks**:
1. Read mixed content aloud
2. Identify any display issues
3. Complete form with mixed input

**Expected Behavior**:
- Bidirectional text renders correctly
- Parentheses align properly
- No character corruption

---

### Scenario 3: Persian (Farsi) Support

**Objective**: Validate Persian language support

**User Profile**:
- Native language: Persian (Farsi)
- Uses Persian keyboard layout

**Tasks**:
1. Switch language to Persian (fa)
2. Complete name entry in Persian script
3. Select Persian date format
4. Submit form

**Validation**:
- Persian characters render correctly
- Date picker shows Persian calendar (Jalali)
- All labels translated

---

## Metrics to Track

### Quantitative Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **Task Success Rate** | ≥90% | Task completion / Total attempts |
| **Time on Task** | Baseline +20% max | Stopwatch / Analytics |
| **Error Rate** | ≤2 per session | Error logs / Observation |
| **Abandonment Rate** | ≤10% | Session analytics |
| **Help Requests** | ≤1 per session | Observer count |
| **Simple Mode Usage** | ≥30% of elderly | Feature analytics |
| **Breathing Exercise Usage** | ≥20% when offered | Feature analytics |
| **Heart Rate Change** | ≤10 BPM increase | Wearable data |
| **System Usability Scale (SUS)** | ≥80 | Post-test questionnaire |
| **Net Promoter Score (NPS)** | ≥50 | Post-test survey |

### Qualitative Metrics

| Metric | Collection Method |
|--------|-------------------|
| **Emotional Response** | Facial expression coding |
| **Verbal Feedback** | Think-aloud protocol |
| **Preference Rankings** | A/B comparison tests |
| **Comfort Rating** | 1-10 Likert scale |
| **Trust Rating** | 1-10 Likert scale |

### Accessibility Metrics

| Metric | Target | Tool |
|--------|--------|------|
| **Screen Reader Success** | 100% critical paths | NVDA/VoiceOver testing |
| **Keyboard Navigation** | 100% functionality | Manual testing |
| **Color Contrast** | 100% WCAG AA | axe DevTools |
| **Touch Target Size** | 100% ≥48px | Chrome DevTools |
| **Reduced Motion Support** | 100% functional | Manual testing |

---

## Survey Questions

### Pre-Test Questionnaire

**Demographics**:
1. What is your age? [18-29 / 30-49 / 50-64 / 65-74 / 75+]
2. What is your primary language? [Dropdown]
3. How comfortable are you with technology? [1-10]
4. Do you use reading glasses? [Yes/No/Sometimes]
5. Have you used a medical app before? [Yes/No]

**Anxiety Baseline** (for anxious user testing):
6. How anxious do you feel right now? [1-10]
7. How anxious do you typically feel about medical appointments? [1-10]
8. Have you been diagnosed with an anxiety disorder? [Yes/No/Prefer not to say]

### Post-Task Questionnaire (After Each Task)

1. How easy was this task? [1-5, Very Difficult to Very Easy]
2. How confident are you that you completed it correctly? [1-5]
3. Did you need help? [Yes/No]
4. If yes, what kind of help?
5. Any comments about this task? [Open text]

### Post-Test Questionnaire

**System Usability Scale (SUS)** - Standard 10 questions:
1. I think that I would like to use this system frequently.
2. I found the system unnecessarily complex.
3. I thought the system was easy to use.
4. I think that I would need the support of a technical person to use this system.
5. I found the various functions in this system were well integrated.
6. I thought there was too much inconsistency in this system.
7. I would imagine that most people would learn to use this system very quickly.
8. I found the system very cumbersome to use.
9. I felt very confident using the system.
10. I needed to learn a lot of things before I could get going with this system.

**Calm/Trust Specific**:
11. How calming did you find the interface? [1-10]
12. How trustworthy did the interface feel? [1-10]
13. Did the colors feel appropriate for a medical setting? [Yes/No/Unsure]
14. Was the text size comfortable to read? [Too small/Just right/Too large]
15. Did you feel in control of the process? [1-10]
16. Would you use Simple Mode again? [Yes/No/Maybe]
17. Did you try the breathing exercise? [Yes/No]
18. If yes, did it help you feel calmer? [Yes/No/Somewhat]

**Net Promoter Score**:
19. How likely are you to recommend this app to a friend or family member? [0-10]

**Open Feedback**:
20. What did you like most about the app?
21. What did you like least?
22. Any suggestions for improvement?

---

## Testing Procedures

### Pre-Session Setup

1. **Environment Check**
   - [ ] Quiet room with good lighting
   - [ ] Device charged and ready
   - [ ] Test environment deployed (staging.diggai.de)
   - [ ] Recording equipment ready (with consent)

2. **Participant Preparation**
   - [ ] Consent form signed
   - [ ] Pre-test questionnaire completed
   - [ ] Wearable device connected (if applicable)
   - [ ] Think-aloud protocol explained

3. **Script**
   ```
   "Thank you for participating. Today we'll be testing a medical 
   intake application. There are no right or wrong answers - we're 
   testing the app, not you. Please think aloud as you complete tasks, 
   sharing what you're thinking and feeling. You can stop at any time."
   ```

### During Session

1. **Observer Guidelines**
   - Do not help unless participant is stuck >60 seconds
   - Note non-verbal cues (facial expressions, sighs)
   - Record time for each task
   - Mark errors and recovery actions

2. **Prompts** (if participant stops thinking aloud):
   - "What are you looking for?"
   - "What do you expect to happen?"
   - "How does that make you feel?"

### Post-Session

1. **Immediate Debrief**
   - [ ] Post-test questionnaire
   - [ ] Informal discussion
   - [ ] Thank participant

2. **Data Processing** (within 24 hours)
   - [ ] Transcribe notes
   - [ ] Calculate metrics
   - [ ] Tag video timestamps
   - [ ] Compile findings

---

## Data Collection Forms

### Task Completion Log

```
Participant ID: _______  Date: _______  Tester: _______

Task 1: First-Time Registration
- Start Time: _______
- End Time: _______
- Duration: _______
- Errors: _______
- Help Requests: _______
- Completed: [ ] Yes [ ] No [ ] Partial
- Notes: _______________________________

Task 2: [Next Task]
...
```

### Observation Checklist

```
Session: _______  Observer: _______

Positive Indicators:
[ ] Smiled during task
[ ] Verbalized confidence
[ ] Completed without hesitation
[ ] Praised interface unprompted
[ ] Used Simple Mode effectively
[ ] Engaged with breathing exercise

Negative Indicators:
[ ] Frowned or showed frustration
[ ] Sighs or exclamations
[ ] Asked for help multiple times
[ ] Abandoned task
[ ] Complained about text size
[ ] Confused by colors/layout
```

### Heart Rate Log (Anxious User Testing)

```
Participant ID: _______  Device: _______

Baseline (2 min rest): ___ BPM
Pre-test form: ___ BPM
During breathing: ___ BPM (min) / ___ BPM (max)
Post-test form: ___ BPM
Recovery: ___ BPM

Notes: _______________________________
```

---

## Data Analysis Framework

### Quantitative Analysis

1. **Descriptive Statistics**
   - Mean, median, standard deviation for all metrics
   - Confidence intervals (95%)

2. **Comparative Analysis**
   - t-tests for between-group comparisons
   - ANOVA for multiple conditions
   - Chi-square for categorical data

3. **Correlation Analysis**
   - Age vs. Simple Mode usage
   - Anxiety baseline vs. breathing exercise effectiveness
   - Tech comfort vs. completion time

### Qualitative Analysis

1. **Thematic Analysis**
   - Code open-ended responses
   - Identify recurring themes
   - Extract quotes for reporting

2. **Video Analysis**
   - Facial expression coding
   - Task flow visualization
   - Error pattern identification

### Reporting Template

```
EXECUTIVE SUMMARY
- Key findings (3-5 bullet points)
- Recommendations (prioritized)

METHODOLOGY
- Participants (n, demographics)
- Test environment
- Scenarios tested

RESULTS
- Quantitative metrics (tables, charts)
- Qualitative findings (themes, quotes)
- Accessibility compliance

RECOMMENDATIONS
- High priority fixes
- Medium priority improvements
- Future research needs
```

---

## Related Documentation

- [Calm/Trust UI Guide](./CALM_TRUST_UI_GUIDE.md)
- [Accessibility Checklist](./ACCESSIBILITY_CHECKLIST.md)
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)
- [Color System Implementation Report](./COLOR_SYSTEM_IMPLEMENTATION_REPORT.md)

---

*Document maintained by the DiggAI UX Research Team*  
*For questions, contact: research@diggai.de*  
*Last Updated: 2026-03-24*
