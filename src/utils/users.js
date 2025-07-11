// In-memory user storage (replace with database in production)
export let users = [
  {
    id: "1",
    email: "admin@audionize.com",
    password: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // "password"
    name: "Admin User",
  },
];

export const addUser = (user) => {
  users.push(user);
};

export const findUserByEmail = (email) => {
  return users.find((user) => user.email === email);
};

export const findUserById = (id) => {
  return users.find((user) => user.id === id);
};
