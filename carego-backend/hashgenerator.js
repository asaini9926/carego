const bcrypt = require("bcrypt");

const password = "Admin@123";   // use your real password
const saltRounds = 10;          // MUST match backend

bcrypt.hash(password, saltRounds).then(console.log);
