# 💸 Split Expense Backend

Backend API for a Split Expense Management application that allows users to track shared expenses, split bills, and manage balances efficiently.

🔗 Frontend Live: https://split-front.vercel.app  

---

## 🚀 Features

- 🔐 JWT Authentication (Login / Signup)
- 👥 Group creation & management
- 💸 Expense splitting between multiple users
- ⚖️ Automatic balance calculation
- 📊 Debt simplification logic
- 🛡️ Rate Limiting for API protection
<!-- ⚡ Caching for optimized performance -->

---

## 🛠️ Tech Stack

- Node.js
- Express.js
- MongoDB
- JWT Authentication
<!-- Redis (for caching / rate limiting) -->

---

## 📂 Project Structure
````bash 
src/
│── controllers/
│── routes/
│── models/
│── middleware/
│── utils/
│── config/
│── app.js / 
server.js
````

---

## ⚙️ Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/Pranav-Choudhary-ui/split_backend.git
cd split_backend
````

### 2. Install dependencies
````bash
npm install
````

### 3. Setup Environment Variables

Create a .env file in root:
````bash
PORT=5000
MONGO_URI=your_mongodb_connection
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN = 1d
````
### 4. Run the server
````bash
npm run dev
````

Server will run at:

````bash
http://localhost:5000
````

🔐 Test Credentials

Use these to quickly test:

````bash
Email: bob@test.com  
Password: Password1!
````

