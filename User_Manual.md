# Automated Attendance Tracking System (AATS) - User Manual

This system is an AI-powered facial recognition platform built for the VNRVJIET staff to securely log their daily attendance across specific college workplaces. It utilizes Time-Restrictions, Geo-fencing, and advanced Liveness Detection to prevent spoofing.

## 1. System Access & Roles

The system supports two primary tiers of users:
* **Admin / HR**: Has access to Global Dashboards, Staff Management, and Workplace Configurations.
* **Staff / Lecturer**: Has access to the Daily Attendance Pipeline and Personal Analytics.

### Default Login Information:
* **Admin**: Log in using your assigned Employee ID (e.g., `ADMIN-01`) or Company Email alongside your password.
* **New Staff**: When a new staff member is added to the system, their default password is set to `vnrvjiet`. They are highly encouraged to log in and change their password in the Profile section immediately.

***

## 2. Staff / Lecturer Workflow

### Step 2.1: The Attendance Pipeline
To log attendance correctly, the system sequentially runs three validations:
1. **Time Restriction**: You must be attempting to log in during a configured "Morning" or "Evening" window. If you punch outside these configured windows (e.g. 1 PM), the system will actively reject the punch.
2. **Geo-Fencing**: Your browser must grant Location/GPS permission. If you are not physically within the configured radius of your assigned branch/building, the verification will fail.
3. **Face Identity & Liveness**: The web-camera automatically turns on. You must look into the camera to scan your face. **Crucially: You must BLINK to prove you are a live human** and not a photograph. Once blinked and matched, the attendance punches.

### Step 2.2: The Profile Console & Heatmap
Lecturers can click **"My Profile"** to view their personal analytics.
* **Scoring Rules**: Punching in for *only* the Morning OR *only* the Evening rewards **0.5 (Half Day)** points. Punching in for *both* slots rewards **1.0 (Full Day)** points.
* **Activity Visualizer**: By hovering over the glowing boxes, you can see the exact timestamps for your Morning and Evening logins over your residency timeline.

***

## 3. Administrator Workflow

### Step 3.1: Staff Configuration
Navigate to the "Staff Management" screen from the sidebar.
* **Enrollment**: You can register lecturers, assign an Employee ID, Branch, Role, and link them to a permanent Workplace.
* **Reference Photos**: The core of the FaceAI! Click the "Upload Photo" action to feed a high-quality picture of the staff member. Ensure it is well-lit and directly facing the camera. This acts as the anchor for all future AI verifications.
* **Retroactive Overrides**: If a lecturer missed an attendance punch due to hardware failure, you can click "Att" to manually toggle their Morning/Evening punches on any date in the last few months.

### Step 3.2: Workplace Engineering (Geo & Time slots)
Different buildings/colleges might operate on different logic.
* **Geo-Location**: You can set an absolute Central Latitude/Longitude for the workplace and declare the maximum allowed radius (e.g., 300 meters).
* **Time slots**: Define explicit start and end hours for Morning checks and explicit start and end hours for Evening checks so staff cannot punch both simultaneously.
