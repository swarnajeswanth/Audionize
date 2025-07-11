import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { users, addUser, findUserByEmail } from "../../../../utils/users";
import {
  validateEmail,
  validatePassword,
  sanitizeInput,
  checkRateLimit,
  RATE_LIMITS,
  getSecurityHeaders,
} from "../../../../utils/security";

export async function POST(request) {
  try {
    // Rate limiting
    const clientIp =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    if (
      !checkRateLimit(
        `signup:${clientIp}`,
        RATE_LIMITS.SIGNUP_ATTEMPTS,
        RATE_LIMITS.SIGNUP_WINDOW
      )
    ) {
      return NextResponse.json(
        { message: "Too many signup attempts. Please try again later." },
        { status: 429, headers: getSecurityHeaders() }
      );
    }

    const { name, email, password } = await request.json();

    // Input sanitization
    const sanitizedName = sanitizeInput(name);
    const sanitizedEmail = sanitizeInput(email);

    // Validation
    if (!sanitizedName || !sanitizedEmail || !password) {
      return NextResponse.json(
        { message: "All fields are required" },
        { status: 400, headers: getSecurityHeaders() }
      );
    }

    if (!validateEmail(sanitizedEmail)) {
      return NextResponse.json(
        { message: "Invalid email format" },
        { status: 400, headers: getSecurityHeaders() }
      );
    }

    if (!validatePassword(password)) {
      return NextResponse.json(
        {
          message:
            "Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character",
        },
        { status: 400, headers: getSecurityHeaders() }
      );
    }

    // Check if user already exists
    const existingUser = findUserByEmail(sanitizedEmail);
    if (existingUser) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 400, headers: getSecurityHeaders() }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = {
      id: (users.length + 1).toString(),
      name: sanitizedName,
      email: sanitizedEmail,
      password: hashedPassword,
    };

    // Add to users array (in production, save to database)
    addUser(newUser);

    // Return user data without password
    const { password: _, ...userWithoutPassword } = newUser;

    return NextResponse.json(
      {
        message: "User created successfully",
        user: userWithoutPassword,
      },
      { status: 201, headers: getSecurityHeaders() }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500, headers: getSecurityHeaders() }
    );
  }
}
