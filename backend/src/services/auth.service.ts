import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User, IUser } from '../models/user.model.js';
import { Wallet, IWallet } from '../models/wallet.model.js';
import { signToken } from '../utils/jwt.js';
import { AppError, UnauthorizedError } from '../utils/errors.js';

export interface RegisterDTO {
  name: string;
  email: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResult {
  user: {
    id: string;
    name: string;
    email: string;
  };
  wallet: {
    id: string;
    balance: number;
    currency: string;
  };
  token: string;
}

export class AuthService {
  async register(data: RegisterDTO): Promise<AuthResult> {
    const email = data.email.toLowerCase().trim();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError('An account with this email address already exists', 400, 'USER_EXISTS');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    let user: IUser | null = null;
    let wallet: IWallet | null = null;

    // Create user and wallet atomically in a transaction
    try {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          const [newUser] = await User.create(
            [{ name: data.name.trim(), email, passwordHash }],
            { session }
          );
          const [newWallet] = await Wallet.create(
            [{ userId: newUser._id, balance: 0, availableBalance: 0, heldBalance: 0, currency: 'INR' }],
            { session }
          );
          user = newUser;
          wallet = newWallet;
        });
      } finally {
        await session.endSession();
      }
    } catch {
      // Fallback if MongoDB is running standalone without replica set transactions
      user = await User.create({ name: data.name.trim(), email, passwordHash });
      wallet = await Wallet.create({ userId: user._id, balance: 0, availableBalance: 0, heldBalance: 0, currency: 'INR' });
    }

    if (!user || !wallet) {
      throw new AppError('Failed to create account', 500, 'INITIALIZATION_FAILED');
    }

    const token = signToken({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
      wallet: {
        id: wallet._id.toString(),
        balance: wallet.balance,
        currency: wallet.currency,
      },
      token,
    };
  }

  async login(data: LoginDTO): Promise<AuthResult> {
    const email = data.email.toLowerCase().trim();

    const user = await User.findOne({ email });
    if (!user) {
      throw new UnauthorizedError('Invalid email or password combination', 'INVALID_CREDENTIALS');
    }

    const isMatch = await user.comparePassword(data.password);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password combination', 'INVALID_CREDENTIALS');
    }

    let wallet = await Wallet.findOne({ userId: user._id });
    if (!wallet) {
      wallet = await Wallet.create({
        userId: user._id,
        balance: 0,
        availableBalance: 0,
        heldBalance: 0,
        currency: 'INR',
      });
    }

    const token = signToken({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
      wallet: {
        id: wallet._id.toString(),
        balance: wallet.balance,
        currency: wallet.currency,
      },
      token,
    };
  }
}

export const authService = new AuthService();
