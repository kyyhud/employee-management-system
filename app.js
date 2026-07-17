let express = require("express");
let fs = require("fs");
let cookieParser = require("cookie-parser");

let app = express();
let PORT = 5000;


app.use(express.json()); // Parse JSON bodies from Postman/API requests
app.use(express.urlencoded({ extended: true })); // Parse HTML form submissions
app.use(cookieParser()); // Parse cookies
app.set("view engine", "ejs");
app.use(express.static("public"));

// Make the logged-in email available to every EJS page
app.use((req, res, next) => {
  res.locals.emailId = req.cookies.emailId || "";
  next();
});

// --------------------
// Helper and utility functions
// --------------------

// Find the next available employee ID
function getNextEmployeeId(employees) {
  let highestId = employees.reduce((maxId, employee) => {
    return Math.max(maxId, Number(employee.employeeId) || 0);
  }, 0);
  return highestId + 1;
}

// Find an employee's array index using employeeId
function findEmployeeIndexById(employees, employeeId) {
  return employees.findIndex((employee) => Number(employee.employeeId) === Number(employeeId));
}

// Read employees from employees.json
function readEmployees() {
  return JSON.parse(fs.readFileSync("employees.json", "utf8"));
}

// Write employees to employees.json
function writeEmployees(employees) {
  fs.writeFileSync("employees.json", JSON.stringify(employees, null, 2));
}

// Create a new employee and add to employees.json
function createEmployee(employeeData) {
  let employeesFs = readEmployees();
  if (!employeeData.emailId) {
    return {
      error: "Employee email is required",
      status: 400,
      employeesFs,
    };
  }
  let submittedEmail = employeeData.emailId.trim().toLowerCase();
  let emailExists = employeesFs.some((employee) => employee.emailId.trim().toLowerCase() === submittedEmail);
  if (emailExists) {
    return {
      error: "Employee already exists",
      status: 400,
      employeesFs,
    };
  }
  let employee = {
    ...employeeData,
    emailId: employeeData.emailId.trim(),
    employeeId: getNextEmployeeId(employeesFs),
  };
  employeesFs.push(employee);
  writeEmployees(employeesFs);
  return {
    employee,
    employeesFs,
    status: 201,
  };
}

// Update an existing employee in employees.json
function updateEmployee(employeeId, employeeData) {
  let employeesFs = readEmployees();
  let employeeIndex = findEmployeeIndexById(employeesFs, employeeId);
  if (employeeIndex === -1) {
    return {
      error: "Employee not found",
      status: 404,
      employeesFs,
    };
  }
  let currentEmployee = employeesFs[employeeIndex];
  let updatedEmail = employeeData.emailId || currentEmployee.emailId;
  let duplicateEmail = employeesFs.some((employee, index) => index !== employeeIndex && employee.emailId.toLowerCase() === updatedEmail.toLowerCase());
  if (duplicateEmail) {
    return {
      error: "Employee email already exists",
      status: 400,
      employeesFs,
    };
  }
  employeesFs[employeeIndex] = {
    ...currentEmployee,
    ...employeeData,
    employeeId: currentEmployee.employeeId,
  };
  writeEmployees(employeesFs);
  return {
    employee: employeesFs[employeeIndex],
    employeesFs,
    status: 200,
  };
}

// Delete an employee from employees.json
function deleteEmployee(employeeId) {
  let employeesFs = readEmployees();
  let employeeIndex = findEmployeeIndexById(employeesFs, employeeId);
  if (employeeIndex === -1) {
    return {
      error: "Employee not found",
      status: 404,
      employeesFs,
    };
  }
  let deletedEmployee = employeesFs.splice(employeeIndex, 1)[0];
  writeEmployees(employeesFs);
  return {
    deletedEmployee,
    employeesFs,
    status: 200,
  };
}

// --------------------
// Login and signup
// --------------------

// http://localhost:5000/
app.get("/", (req, res) => {
  let msg = "";
  res.clearCookie("emailId");
  res.render("login", { msg });
});

// http://localhost:5000/signUp
app.get("/signUp", (req, res) => {
  let msg = "";
  res.render("signUp", { msg });
});

app.post("/signIn", (req, res) => {
  let msg = "";
  let login = req.body;
  let loginFs = JSON.parse(fs.readFileSync("logins.json", "utf8"));
  let loginExists = loginFs.find((user) => user.emailId === login.emailId && user.password === login.password);
  if (loginExists) {
    let emailId = loginExists.emailId;
    let employeesFs = readEmployees();
    res.cookie("emailId", emailId, { httpOnly: true, sameSite: "lax" });
    res.render("employees", { emailId, employeesFs });
  } else {
    msg = "Invalid email or password";
    res.render("login", { msg });
  }
});

app.post("/signUp", (req, res) => {
  let msg = "";
  let login = req.body;
  let loginFs = JSON.parse(fs.readFileSync("logins.json", "utf8"));
  let loginExists = loginFs.find((user) => user.emailId === login.emailId);
  if (loginExists) {
    msg = "Account already exists";
    res.render("signUp", { msg });
  } else {
    msg = "Account created successfully";
    loginFs.push(login);
    fs.writeFileSync("logins.json", JSON.stringify(loginFs, null, 2));
    res.render("signUp", { msg });
  }
});

// --------------------
// Employee page routes
// --------------------

// http://localhost:5000/employeesCount
app.get("/employeesCount", (req, res) => {
  let employeesFs = readEmployees();
  res.json({ count: employeesFs.length });
});

// http://localhost:5000/employees
app.get("/employees", (req, res) => {
  let emailId = res.locals.emailId;
  let employeesFs = readEmployees();
  res.render("employees", { emailId, employeesFs });
});

// http://localhost:5000/addEmployee
app.get("/addEmployee", (req, res) => {
  let msg = "";
  let employeesFs = readEmployees();
  res.render("addEmployee", { msg, employeesFs });
});

// http://localhost:5000/manageEmployees
app.get("/manageEmployees", (req, res) => {
  let msg = "";
  let employeesFs = readEmployees();
  res.render("manageEmployees", { msg, employeesFs });
});

// --------------------
// Employee form routes
// --------------------

app.post("/addEmployeeInFile", (req, res) => {
  let result = createEmployee(req.body);
  if (result.error) {
    return res.status(result.status).render("addEmployee", {
      msg: result.error,
      employeesFs: result.employeesFs,
    });
  }
  res.render("addEmployee", {
    msg: "Employee added successfully",
    employeesFs: result.employeesFs,
  });
});

app.post("/updateEmployeeInFile", (req, res) => {
  let result = updateEmployee(req.body.employeeId, req.body);
  if (result.error) {
    return res.status(result.status).render("manageEmployees", {
      msg: result.error,
      employeesFs: result.employeesFs,
    });
  }
  res.render("manageEmployees", {
    msg: "Employee updated successfully",
    employeesFs: result.employeesFs,
  });
});

app.post("/deleteEmployeeInFile", (req, res) => {
  let result = deleteEmployee(req.body.employeeId);
  if (result.error) {
    return res.status(result.status).render("manageEmployees", {
      msg: result.error,
      employeesFs: result.employeesFs,
    });
  }
  res.render("manageEmployees", {
    msg: "Employee deleted successfully",
    employeesFs: result.employeesFs,
  });
});

// --------------------
// CRUD API routes
// Test these with Postman
// --------------------

// READ all employees
app.get("/api/employees", (req, res) => {
  let employeesFs = readEmployees();
  res.json(employeesFs);
});

// READ one employee
app.get("/api/employees/:employeeId", (req, res) => {
  let employeesFs = readEmployees();
  let employee = employeesFs.find((employee) => Number(employee.employeeId) === Number(req.params.employeeId));
  if (!employee) {
    return res.status(404).json({
      message: "Employee not found",
    });
  }
  res.json(employee);
});

// CREATE employee
app.post("/api/employees", (req, res) => {
  let result = createEmployee(req.body);
  if (result.error) {
    return res.status(result.status).json({
      message: result.error,
    });
  }
  res.status(result.status).json({
    message: "Employee added successfully",
    employee: result.employee,
  });
});

// UPDATE employee
app.patch("/api/employees/:employeeId", (req, res) => {
  let result = updateEmployee(req.params.employeeId, req.body);
  if (result.error) {
    return res.status(result.status).json({
      message: result.error,
    });
  }
  res.status(200).json({
    message: "Employee updated successfully",
    employee: result.employee,
  });
});

// DELETE employee
app.delete("/api/employees/:employeeId", (req, res) => {
  let result = deleteEmployee(req.params.employeeId);
  if (result.error) {
    return res.status(result.status).json({
      message: result.error,
    });
  }
  res.status(result.status).json({
    message: "Employee deleted successfully",
    employee: result.deletedEmployee,
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port number ${PORT}`);
});
