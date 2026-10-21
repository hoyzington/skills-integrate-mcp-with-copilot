document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const teacherRequired = document.getElementById("teacher-required");
  const loginToggle = document.getElementById("teacher-login-toggle");
  const loginForm = document.getElementById("teacher-login-form");
  const teacherSession = document.getElementById("teacher-session");
  const teacherSessionName = document.getElementById("teacher-session-name");
  const logoutButton = document.getElementById("teacher-logout");
  let isTeacher = false;
  let messageTimeout;

  function showMessage(text, type) {
    window.clearTimeout(messageTimeout);
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageTimeout = window.setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function updateTeacherControls(username) {
    loginToggle.classList.toggle("hidden", isTeacher);
    loginForm.classList.add("hidden");
    loginToggle.setAttribute("aria-expanded", "false");
    teacherSession.classList.toggle("hidden", !isTeacher);
    teacherRequired.classList.toggle("hidden", isTeacher);
    signupForm.classList.toggle("hidden", !isTeacher);
    teacherSessionName.textContent = isTeacher ? `Signed in as ${username}` : "";
  }

  async function refreshTeacherSession() {
    try {
      const response = await fetch("/auth/me");
      const session = await response.json();
      isTeacher = response.ok && session.authenticated;
      updateTeacherControls(session.username);
    } catch (error) {
      isTeacher = false;
      updateTeacherControls();
      console.error("Error checking teacher session:", error);
    }
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = Math.max(
          0,
          details.max_participants - details.participants.length
        );
        const title = document.createElement("h4");
        title.textContent = name;
        const description = document.createElement("p");
        description.textContent = details.description;
        const schedule = document.createElement("p");
        schedule.innerHTML = `<strong>Schedule:</strong> ${details.schedule}`;
        const availability = document.createElement("p");
        availability.innerHTML = `<strong>Availability:</strong> ${spotsLeft} spots left`;
        activityCard.append(title, description, schedule, availability);

        const participantsContainer = document.createElement("div");
        participantsContainer.className = "participants-container participants-section";
        if (details.participants.length > 0) {
          const participantsHeading = document.createElement("h5");
          participantsHeading.textContent = "Participants:";
          const participantsList = document.createElement("ul");
          participantsList.className = "participants-list";

          details.participants.forEach((email) => {
            const participant = document.createElement("li");
            const participantEmail = document.createElement("span");
            participantEmail.className = "participant-email";
            participantEmail.textContent = email;
            participant.appendChild(participantEmail);

            if (isTeacher) {
              const deleteButton = document.createElement("button");
              deleteButton.className = "delete-btn";
              deleteButton.type = "button";
              deleteButton.textContent = "Remove";
              deleteButton.setAttribute("aria-label", `Remove ${email} from ${name}`);
              deleteButton.dataset.activity = name;
              deleteButton.dataset.email = email;
              deleteButton.addEventListener("click", handleUnregister);
              participant.appendChild(deleteButton);
            }
            participantsList.appendChild(participant);
          });
          participantsContainer.append(participantsHeading, participantsList);
        } else {
          const emptyMessage = document.createElement("p");
          emptyMessage.innerHTML = "<em>No participants yet</em>";
          participantsContainer.appendChild(emptyMessage);
        }
        activityCard.appendChild(participantsContainer);

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");
    button.disabled = true;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
        if (response.status === 401) {
          await refreshTeacherSession();
          fetchActivities();
        }
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    } finally {
      button.disabled = false;
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!isTeacher) {
      showMessage("Teacher login is required to manage registrations.", "error");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
        if (response.status === 401) {
          await refreshTeacherSession();
        }
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  loginToggle.addEventListener("click", () => {
    const isExpanded = loginToggle.getAttribute("aria-expanded") === "true";
    loginToggle.setAttribute("aria-expanded", String(!isExpanded));
    loginForm.classList.toggle("hidden", isExpanded);
    if (!isExpanded) {
      document.getElementById("teacher-username").focus();
    }
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = document.getElementById("teacher-username").value.trim();
    const password = document.getElementById("teacher-password").value;
    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.detail || "Unable to log in");
      }
      isTeacher = true;
      loginForm.reset();
      updateTeacherControls(result.username);
      await fetchActivities();
      showMessage("Teacher login successful.", "success");
    } catch (error) {
      showMessage(error.message || "Unable to log in. Please try again.", "error");
    }
  });

  logoutButton.addEventListener("click", async () => {
    try {
      const response = await fetch("/auth/logout", { method: "POST" });
      if (!response.ok) {
        throw new Error("Unable to log out");
      }
      isTeacher = false;
      updateTeacherControls();
      await fetchActivities();
      showMessage("Logged out.", "success");
    } catch (error) {
      showMessage(error.message || "Unable to log out. Please try again.", "error");
    }
  });

  // Initialize app
  refreshTeacherSession().then(fetchActivities);
});
