import { useEffect, useMemo, useState } from "react";
import "./style.css";

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";
const ADMIN_CODE = "QB-ADMIN-2026";

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

const makeQuestion = () => ({
  question: "",
  options: ["", "", "", ""],
  correct: "",
});

export default function App() {
  const [users, setUsers] = useState(() => readStorage("users", []));
  const [quizzes, setQuizzes] = useState(() => readStorage("quizzes", []));
  const [attempts, setAttempts] = useState(() => readStorage("attempts", []));
  const [currentUser, setCurrentUser] = useState(() =>
    readStorage("loggedUser", null)
  );
  const [page, setPage] = useState(() =>
    readStorage("loggedUser", null) ? "dashboard" : "auth"
  );
  const [authMode, setAuthMode] = useState("signup");
  const [message, setMessage] = useState("");

  const [signupData, setSignupData] = useState({
    username: "",
    email: "",
    password: "",
    role: "user",
  });
  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  });

  const [quizTitle, setQuizTitle] = useState("");
  const [quizDescription, setQuizDescription] = useState("");
  const [questions, setQuestions] = useState([]);
  const [quizMessage, setQuizMessage] = useState("");
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  useEffect(() => {
    localStorage.setItem("users", JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem("quizzes", JSON.stringify(quizzes));
  }, [quizzes]);

  useEffect(() => {
    localStorage.setItem("attempts", JSON.stringify(attempts));
  }, [attempts]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("loggedUser", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("loggedUser");
    }
  }, [currentUser]);

  const myQuizzes = useMemo(
    () => quizzes.filter((quiz) => quiz.owner === currentUser?.username),
    [quizzes, currentUser]
  );

  const myAttempts = useMemo(
    () => attempts.filter((attempt) => attempt.username === currentUser?.username),
    [attempts, currentUser]
  );

  const totalMyQuestions = myQuizzes.reduce(
    (total, quiz) => total + quiz.questions.length,
    0
  );

  const allQuestionCount = quizzes.reduce(
    (total, quiz) => total + quiz.questions.length,
    0
  );

  const allUsers = [
    {
      username: ADMIN_USERNAME,
      email: "admin@quizbuilder.com",
      role: "admin",
      isDefault: true,
    },
    ...users,
  ];

  function handleSignup(event) {
    event.preventDefault();

    const username = signupData.username.trim();
    const email = signupData.email.trim().toLowerCase();
    const password = signupData.password;
    const role = signupData.role;

    if (!username || !email || !password) {
      setMessage("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must contain at least 6 characters.");
      return;
    }

    if (username.toLowerCase() === ADMIN_USERNAME) {
      setMessage("This username is reserved.");
      return;
    }

    if (
      users.some(
        (user) =>
          user.username.toLowerCase() === username.toLowerCase() ||
          user.email.toLowerCase() === email
      )
    ) {
      setMessage("Username or email already exists.");
      return;
    }

    if (role === "admin") {
      const code = window.prompt("Enter the admin registration code:");
      if (code !== ADMIN_CODE) {
        setMessage("Invalid admin registration code.");
        return;
      }
    }

    setUsers((previous) => [
      ...previous,
      { username, email, password, role },
    ]);
    setSignupData({
      username: "",
      email: "",
      password: "",
      role: "user",
    });
    setMessage("Registration successful. Please log in.");
    setAuthMode("login");
  }

  function handleLogin(event) {
    event.preventDefault();

    const username = loginData.username.trim();
    const password = loginData.password;

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      setCurrentUser({
        username: ADMIN_USERNAME,
        email: "admin@quizbuilder.com",
        role: "admin",
      });
      setPage("dashboard");
      setMessage("");
      return;
    }

    const foundUser = users.find(
      (user) =>
        user.username.toLowerCase() === username.toLowerCase() &&
        user.password === password
    );

    if (!foundUser) {
      setMessage("Invalid username or password.");
      return;
    }

    setCurrentUser(foundUser);
    setPage("dashboard");
    setMessage("");
  }

  function logout() {
    setCurrentUser(null);
    setCurrentQuiz(null);
    setAnswers({});
    setResult(null);
    setPage("auth");
    setAuthMode("login");
    setLoginData({ username: "", password: "" });
    setMessage("");
  }

  function navigate(target) {
    if (target === "adminDashboard" && currentUser?.role !== "admin") {
      window.alert("Admin access required.");
      return;
    }
    setPage(target);
    setQuizMessage("");
  }

  function updateQuestion(questionIndex, field, value) {
    setQuestions((previous) =>
      previous.map((question, index) =>
        index === questionIndex ? { ...question, [field]: value } : question
      )
    );
  }

  function updateOption(questionIndex, optionIndex, value) {
    setQuestions((previous) =>
      previous.map((question, index) =>
        index === questionIndex
          ? {
              ...question,
              options: question.options.map((option, i) =>
                i === optionIndex ? value : option
              ),
            }
          : question
      )
    );
  }

  function saveQuiz(event) {
    event.preventDefault();

    if (!quizTitle.trim()) {
      setQuizMessage("Please enter a quiz title.");
      return;
    }

    if (questions.length === 0) {
      setQuizMessage("Please add at least one question.");
      return;
    }

    for (let index = 0; index < questions.length; index += 1) {
      const question = questions[index];

      if (!question.question.trim()) {
        setQuizMessage(`Please enter Question ${index + 1}.`);
        return;
      }

      if (question.options.some((option) => !option.trim())) {
        setQuizMessage(`Please fill all options for Question ${index + 1}.`);
        return;
      }

      if (question.correct === "") {
        setQuizMessage(
          `Please select the correct answer for Question ${index + 1}.`
        );
        return;
      }
    }

    const newQuiz = {
      id: Date.now(),
      owner: currentUser.username,
      title: quizTitle.trim(),
      description: quizDescription.trim(),
      questions: questions.map((question) => ({
        ...question,
        correct: Number(question.correct),
      })),
    };

    setQuizzes((previous) => [...previous, newQuiz]);
    setQuizTitle("");
    setQuizDescription("");
    setQuestions([]);
    setQuizMessage("");
    setPage("quizList");
  }

  function startQuiz(quiz) {
    setCurrentQuiz(quiz);
    setAnswers({});
    setResult(null);
    setPage("attemptQuiz");
  }

  function submitQuiz() {
    if (!currentQuiz) return;

    const score = currentQuiz.questions.reduce(
      (total, question, index) =>
        total + (Number(answers[index]) === question.correct ? 1 : 0),
      0
    );

    const total = currentQuiz.questions.length;
    const percentage = total
      ? Math.round((score / total) * 100)
      : 0;

    setResult({ score, total, percentage });

    setAttempts((previous) => [
      ...previous,
      {
        username: currentUser.username,
        quizId: currentQuiz.id,
        quizTitle: currentQuiz.title,
        score,
        total,
        date: new Date().toLocaleString(),
      },
    ]);

    setPage("result");
  }

  function deleteOwnQuiz(id) {
    if (!window.confirm("Are you sure you want to delete this quiz?")) return;

    setQuizzes((previous) =>
      previous.filter(
        (quiz) =>
          !(quiz.id === id && quiz.owner === currentUser.username)
      )
    );
  }

  function deleteUser(username) {
    if (username === ADMIN_USERNAME) {
      window.alert("The default admin account cannot be deleted.");
      return;
    }

    if (username === currentUser.username) {
      window.alert("You cannot delete the account you are currently using.");
      return;
    }

    if (!window.confirm(`Delete user "${username}" and their data?`)) return;

    setUsers((previous) =>
      previous.filter((user) => user.username !== username)
    );
    setQuizzes((previous) =>
      previous.filter((quiz) => quiz.owner !== username)
    );
    setAttempts((previous) =>
      previous.filter((attempt) => attempt.username !== username)
    );
  }

  function adminDeleteQuiz(id) {
    if (!window.confirm("Delete this quiz permanently?")) return;
    setQuizzes((previous) => previous.filter((quiz) => quiz.id !== id));
    setAttempts((previous) =>
      previous.filter((attempt) => attempt.quizId !== id)
    );
  }

  if (!currentUser) {
    return (
      <section className="auth-container">
        <div className="auth-box">
          <h1>Quiz Builder</h1>
          {authMode === "signup" ? (
            <>
              <p>Create your account to get started</p>
              <form onSubmit={handleSignup}>
                <input
                  type="text"
                  placeholder="Username"
                  autoComplete="username"
                  value={signupData.username}
                  onChange={(event) =>
                    setSignupData({
                      ...signupData,
                      username: event.target.value,
                    })
                  }
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  autoComplete="email"
                  value={signupData.email}
                  onChange={(event) =>
                    setSignupData({
                      ...signupData,
                      email: event.target.value,
                    })
                  }
                  required
                />
                <input
                  type="password"
                  placeholder="Password (minimum 6 characters)"
                  autoComplete="new-password"
                  value={signupData.password}
                  onChange={(event) =>
                    setSignupData({
                      ...signupData,
                      password: event.target.value,
                    })
                  }
                  required
                />
                <label className="role-label" htmlFor="signup-role">
                  Register as
                </label>
                <select
                  id="signup-role"
                  value={signupData.role}
                  onChange={(event) =>
                    setSignupData({
                      ...signupData,
                      role: event.target.value,
                    })
                  }
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
                <button type="submit">Register</button>
              </form>
              <p className="switch">
                Already have an account?{" "}
                <span
                  onClick={() => {
                    setAuthMode("login");
                    setMessage("");
                  }}
                >
                  Login
                </span>
              </p>
            </>
          ) : (
            <>
              <p>Login to continue</p>
              <form onSubmit={handleLogin}>
                <input
                  type="text"
                  placeholder="Username"
                  autoComplete="username"
                  value={loginData.username}
                  onChange={(event) =>
                    setLoginData({
                      ...loginData,
                      username: event.target.value,
                    })
                  }
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  autoComplete="current-password"
                  value={loginData.password}
                  onChange={(event) =>
                    setLoginData({
                      ...loginData,
                      password: event.target.value,
                    })
                  }
                  required
                />
                <button type="submit">Login</button>
              </form>
              <p className="switch">
                Don't have an account?{" "}
                <span
                  onClick={() => {
                    setAuthMode("signup");
                    setMessage("");
                  }}
                >
                  Sign Up
                </span>
              </p>
            </>
          )}
          {message && <p className="message">{message}</p>}
        </div>
      </section>
    );
  }

  return (
    <>
      <header className="navbar">
        <div className="logo">Quiz Builder</div>
        <nav>
          <button onClick={() => navigate("dashboard")}>Dashboard</button>
          <button onClick={() => navigate("createQuiz")}>Create Quiz</button>
          <button onClick={() => navigate("quizList")}>My Quizzes</button>
          {currentUser.role === "admin" && (
            <button
              className="admin-nav"
              onClick={() => navigate("adminDashboard")}
            >
              Admin
            </button>
          )}
          <button onClick={() => navigate("profile")}>Profile</button>
          <button className="logout" onClick={logout}>
            Logout
          </button>
        </nav>
      </header>

      {page === "dashboard" && (
        <main className="module">
          <div className="welcome">
            <h1>Welcome, {currentUser.username}!</h1>
            <p>Create, manage and attempt quizzes.</p>
          </div>
          <div className="dashboard-grid">
            <Stat value={myQuizzes.length} label="Total Quizzes" />
            <Stat value={totalMyQuestions} label="Total Questions" />
            <Stat value={myAttempts.length} label="Attempts" />
          </div>
          <div className="quick-actions">
            <h2>Quick Actions</h2>
            <button onClick={() => navigate("createQuiz")}>
              + Create New Quiz
            </button>
            <button onClick={() => navigate("quizList")}>
              View My Quizzes
            </button>
          </div>
        </main>
      )}

      {page === "createQuiz" && (
        <main className="module">
          <div className="module-header">
            <h1>Create Quiz</h1>
            <p>Create your own custom quiz.</p>
          </div>
          <form className="quiz-form" onSubmit={saveQuiz}>
            <label htmlFor="quiz-title">Quiz Title</label>
            <input
              id="quiz-title"
              value={quizTitle}
              onChange={(event) => setQuizTitle(event.target.value)}
              placeholder="Enter quiz title"
              required
            />

            <label htmlFor="quiz-description">Description</label>
            <textarea
              id="quiz-description"
              value={quizDescription}
              onChange={(event) => setQuizDescription(event.target.value)}
              placeholder="Enter quiz description"
            />

            <h2>Questions</h2>
            {questions.map((question, questionIndex) => (
              <div className="question-box" key={questionIndex}>
                <h3>Question {questionIndex + 1}</h3>
                <input
                  className="question-text"
                  value={question.question}
                  onChange={(event) =>
                    updateQuestion(
                      questionIndex,
                      "question",
                      event.target.value
                    )
                  }
                  placeholder="Enter question"
                  required
                />
                {question.options.map((option, optionIndex) => (
                  <div className="option-row" key={optionIndex}>
                    <input
                      type="radio"
                      name={`correct-${questionIndex}`}
                      checked={question.correct === String(optionIndex)}
                      onChange={() =>
                        updateQuestion(
                          questionIndex,
                          "correct",
                          String(optionIndex)
                        )
                      }
                      aria-label={`Mark option ${optionIndex + 1} correct`}
                    />
                    <input
                      value={option}
                      onChange={(event) =>
                        updateOption(
                          questionIndex,
                          optionIndex,
                          event.target.value
                        )
                      }
                      placeholder={`Option ${optionIndex + 1}`}
                      required
                    />
                  </div>
                ))}
              </div>
            ))}

            <button
              type="button"
              className="secondary-btn"
              onClick={() => setQuestions((previous) => [...previous, makeQuestion()])}
            >
              + Add Question
            </button>
            <button type="submit" className="primary-btn">
              Save Quiz
            </button>
            {quizMessage && <p className="message">{quizMessage}</p>}
          </form>
        </main>
      )}

      {page === "quizList" && (
        <main className="module">
          <div className="module-header">
            <h1>My Quizzes</h1>
            <p>Manage and attempt your quizzes.</p>
          </div>
          <div className="quiz-grid">
            {myQuizzes.length ? (
              myQuizzes.map((quiz) => (
                <div className="quiz-card" key={quiz.id}>
                  <h2>{quiz.title}</h2>
                  <p>{quiz.description || "No description"}</p>
                  <p>Questions: {quiz.questions.length}</p>
                  <button onClick={() => startQuiz(quiz)}>Attempt</button>
                  <button
                    className="delete-btn"
                    onClick={() => deleteOwnQuiz(quiz.id)}
                  >
                    Delete
                  </button>
                </div>
              ))
            ) : (
              <div className="quiz-card">
                <h2>No quizzes found</h2>
                <p>Create your first quiz.</p>
              </div>
            )}
          </div>
        </main>
      )}

      {page === "attemptQuiz" && currentQuiz && (
        <main className="module">
          <div className="module-header">
            <h1>{currentQuiz.title}</h1>
            <p>{currentQuiz.description}</p>
          </div>
          {currentQuiz.questions.map((question, questionIndex) => (
            <div className="attempt-question" key={questionIndex}>
              <h3>
                {questionIndex + 1}. {question.question}
              </h3>
              {question.options.map((option, optionIndex) => (
                <label className="answer-option" key={optionIndex}>
                  <input
                    type="radio"
                    name={`answer-${questionIndex}`}
                    checked={answers[questionIndex] === String(optionIndex)}
                    onChange={() =>
                      setAnswers((previous) => ({
                        ...previous,
                        [questionIndex]: String(optionIndex),
                      }))
                    }
                  />
                  {option}
                </label>
              ))}
            </div>
          ))}
          <button className="primary-btn" onClick={submitQuiz}>
            Submit Quiz
          </button>
        </main>
      )}

      {page === "result" && result && (
        <main className="module">
          <div className="result-box">
            <h1>Quiz Completed!</h1>
            <div className="score-circle">
              <span>
                {result.score}/{result.total}
              </span>
            </div>
            <h2>You scored {result.percentage}%</h2>
            <button onClick={() => navigate("quizList")}>
              Back to Quizzes
            </button>
            <button onClick={() => navigate("dashboard")}>Dashboard</button>
          </div>
        </main>
      )}

      {page === "profile" && (
        <main className="module">
          <div className="profile-box">
            <h1>My Profile</h1>
            <div className="profile-info">
              <p>
                <strong>Username:</strong> {currentUser.username}
              </p>
              <p>
                <strong>Email:</strong> {currentUser.email}
              </p>
              <p>
                <strong>Role:</strong> {currentUser.role}
              </p>
            </div>
            <button className="logout" onClick={logout}>
              Logout
            </button>
          </div>
        </main>
      )}

      {page === "adminDashboard" && currentUser.role === "admin" && (
        <main className="module">
          <div className="module-header">
            <h1>Admin Dashboard</h1>
            <p>Manage users, quizzes and attempts.</p>
          </div>

          <div className="dashboard-grid">
            <Stat value={allUsers.length} label="Total Accounts" />
            <Stat value={users.filter((user) => user.role === "admin").length + 1} label="Total Admins" />
            <Stat value={quizzes.length} label="Total Quizzes" />
            <Stat value={allQuestionCount} label="Total Questions" />
            <Stat value={attempts.length} label="Total Attempts" />
          </div>

          <section className="admin-section">
            <h2>Registered Users and Admins</h2>
            {allUsers.map((user) => (
              <div className="admin-user" key={user.username}>
                <div className="admin-user-info">
                  <strong>
                    {user.username} {user.isDefault ? "(Default)" : ""}
                  </strong>
                  <span>{user.email}</span>
                  <span className="role-chip">{user.role}</span>
                </div>
                {!user.isDefault && (
                  <button
                    className="admin-delete"
                    onClick={() => deleteUser(user.username)}
                  >
                    Delete Account
                  </button>
                )}
              </div>
            ))}
          </section>

          <section className="admin-section">
            <h2>All Quizzes</h2>
            <div className="quiz-grid">
              {quizzes.length ? (
                quizzes.map((quiz) => (
                  <div className="quiz-card" key={quiz.id}>
                    <h2>{quiz.title}</h2>
                    <p>Owner: {quiz.owner}</p>
                    <p>Questions: {quiz.questions.length}</p>
                    <button
                      className="delete-btn"
                      onClick={() => adminDeleteQuiz(quiz.id)}
                    >
                      Delete Quiz
                    </button>
                  </div>
                ))
              ) : (
                <p>No quizzes available.</p>
              )}
            </div>
          </section>

          <section className="admin-section">
            <h2>Quiz Attempts</h2>
            {attempts.length ? (
              <div className="table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Quiz</th>
                      <th>Score</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.map((attempt, index) => (
                      <tr key={`${attempt.username}-${attempt.quizId}-${index}`}>
                        <td>{attempt.username}</td>
                        <td>{attempt.quizTitle}</td>
                        <td>
                          {attempt.score}/{attempt.total}
                        </td>
                        <td>{attempt.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No quiz attempts yet.</p>
            )}
          </section>
        </main>
      )}
    </>
  );
}

function Stat({ value, label }) {
  return (
    <div className="dashboard-card">
      <h2>{value}</h2>
      <p>{label}</p>
    </div>
  );
}
