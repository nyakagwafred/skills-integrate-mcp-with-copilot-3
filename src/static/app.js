document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const loginModal = document.getElementById("login-modal");
  const userIcon = document.getElementById("user-icon");
  const loginForm = document.getElementById("login-form");
  const loginStatus = document.getElementById("login-status");
  const usernameSpan = document.getElementById("username");
  const logoutBtn = document.getElementById("logout-btn");
  const authNotice = document.getElementById("auth-notice");
  const loginMessage = document.getElementById("login-message");

  // Session management
  let isAuthenticated = false;
  let currentUser = null;
  let sessionToken = null;

  // Check authentication status on page load
  checkAuthStatus();

  // Event listeners
  userIcon.addEventListener("click", showLoginModal);
  loginForm.addEventListener("submit", handleLogin);
  logoutBtn.addEventListener("click", handleLogout);
  
  // Close modal when clicking X or outside
  document.querySelector(".close").addEventListener("click", hideLoginModal);
  loginModal.addEventListener("click", (e) => {
    if (e.target === loginModal) {
      hideLoginModal();
    }
  });

  // Function to check authentication status
  async function checkAuthStatus() {
    try {
      const response = await fetch("/auth/status", {
        credentials: 'include'
      });
      const result = await response.json();
      
      if (result.authenticated) {
        isAuthenticated = true;
        currentUser = result.username;
        updateUIForAuthenticatedUser();
      } else {
        isAuthenticated = false;
        currentUser = null;
        updateUIForUnauthenticatedUser();
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      isAuthenticated = false;
      updateUIForUnauthenticatedUser();
    }
  }

  // Update UI for authenticated user
  function updateUIForAuthenticatedUser() {
    userIcon.classList.add("hidden");
    loginStatus.classList.remove("hidden");
    usernameSpan.textContent = currentUser;
    authNotice.classList.add("hidden");
    signupForm.classList.remove("hidden");
  }

  // Update UI for unauthenticated user
  function updateUIForUnauthenticatedUser() {
    userIcon.classList.remove("hidden");
    loginStatus.classList.add("hidden");
    authNotice.classList.remove("hidden");
    signupForm.classList.add("hidden");
  }

  // Show login modal
  function showLoginModal() {
    loginModal.classList.remove("hidden");
    document.getElementById("login-username").focus();
  }

  // Hide login modal
  function hideLoginModal() {
    loginModal.classList.add("hidden");
    loginForm.reset();
    loginMessage.classList.add("hidden");
  }

  // Handle login
  async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        credentials: 'include'
      });

      const result = await response.json();

      if (response.ok) {
        isAuthenticated = true;
        currentUser = result.username;
        sessionToken = result.session_token;
        
        // Set session cookie
        document.cookie = `session_token=${sessionToken}; path=/; max-age=86400`; // 24 hours
        
        updateUIForAuthenticatedUser();
        hideLoginModal();
        
        loginMessage.textContent = "Login successful!";
        loginMessage.className = "success";
        loginMessage.classList.remove("hidden");
        
        setTimeout(() => {
          loginMessage.classList.add("hidden");
        }, 3000);
      } else {
        loginMessage.textContent = result.detail || "Invalid credentials";
        loginMessage.className = "error";
        loginMessage.classList.remove("hidden");
      }
    } catch (error) {
      loginMessage.textContent = "Login failed. Please try again.";
      loginMessage.className = "error";
      loginMessage.classList.remove("hidden");
      console.error("Login error:", error);
    }
  }

  // Handle logout
  async function handleLogout() {
    try {
      await fetch("/auth/logout", {
        method: "POST",
        credentials: 'include'
      });
      
      // Clear session cookie
      document.cookie = "session_token=; path=/; max-age=0";
      
      isAuthenticated = false;
      currentUser = null;
      sessionToken = null;
      
      updateUIForUnauthenticatedUser();
      
      messageDiv.textContent = "Logged out successfully";
      messageDiv.className = "success";
      messageDiv.classList.remove("hidden");
      
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 3000);
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons only for authenticated users
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li>
                        <span class="participant-email">${email}</span>
                        ${isAuthenticated ? 
                          `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>` : 
                          ''
                        }
                      </li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons (only if authenticated)
      if (isAuthenticated) {
        document.querySelectorAll(".delete-btn").forEach((button) => {
          button.addEventListener("click", handleUnregister);
        });
      }
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality (teacher only)
  async function handleUnregister(event) {
    if (!isAuthenticated) {
      messageDiv.textContent = "You must be logged in as a teacher to unregister students.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      return;
    }

    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          credentials: 'include'
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission (teacher only)
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!isAuthenticated) {
      messageDiv.textContent = "You must be logged in as a teacher to register students.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
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
          credentials: 'include'
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});