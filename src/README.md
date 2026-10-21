# Mergington High School Activities API

A super simple FastAPI application that allows students to view and sign up for extracurricular activities.

## Features

- View all available extracurricular activities
- Teachers can sign students up for activities or unregister them
- Students can browse activities and view participant lists without logging in

## Teacher access

Teacher credentials are stored as salted PBKDF2 password hashes in `src/teachers.json`, which is ignored by Git. Create the file from the example, then generate a hash with the helper:

1. Copy `src/teachers.example.json` to `src/teachers.json` and replace the example username and password hash.
2. Run `python src/auth.py` and enter the teacher password when prompted. Copy the printed hash into the matching `password_hash` field.
3. Set a persistent session signing key before starting the server:

   ```sh
   export ADMIN_SESSION_SECRET="$(python -c 'import secrets; print(secrets.token_urlsafe(32))')"
   ```

`TEACHER_CREDENTIALS_FILE` can point to a credentials JSON file outside the project. For HTTPS deployments, set `COOKIE_SECURE=true` so the session cookie is only sent over secure connections. Keep the session secret and credential file private. The default credential path is `src/teachers.json`.

## Getting Started

1. Install the dependencies:

   ```
   pip install -r requirements.txt
   ```

2. Configure at least one teacher account and set `ADMIN_SESSION_SECRET` as described in [Teacher access](#teacher-access).

3. Run the application from the repository root:

   ```
   uvicorn app:app --app-dir src
   ```

4. Open your browser and go to:
   - API documentation: http://localhost:8000/docs
   - Alternative documentation: http://localhost:8000/redoc

## API Endpoints

| Method | Endpoint                                                          | Description                                                         |
| ------ | ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| GET    | `/activities`                                                     | Get all activities with their details and current participant count |
| GET    | `/auth/me`                                                        | Check whether the current browser has a teacher session             |
| POST   | `/auth/login`                                                     | Log in with a teacher username and password                         |
| POST   | `/auth/logout`                                                    | End the current teacher session                                     |
| POST   | `/activities/{activity_name}/signup?email=student@mergington.edu` | Teacher-only student signup                                         |
| DELETE | `/activities/{activity_name}/unregister?email=student@mergington.edu` | Teacher-only student unregister                                  |

## Data Model

The application uses a simple data model with meaningful identifiers:

1. **Activities** - Uses activity name as identifier:

   - Description
   - Schedule
   - Maximum number of participants allowed
   - List of student emails who are signed up

2. **Students** - Uses email as identifier:
   - Name
   - Grade level

All data is stored in memory, which means data will be reset when the server restarts.
