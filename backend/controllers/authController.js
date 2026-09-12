import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const createToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

export const register = async (req, res) => {
  try {
    // Note: Zod middleware is now the primary validation layer; these controller checks act as a fallback.
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ 
        message: 'Please provide name, email, and password' 
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'User already exists with this email' 
      });
    }

    // Security: Public registration always forces role: 'citizen' to prevent privilege escalation.
    // Authority role assignment must go through a separate, protected/admin-only mechanism in a future phase.
    const user = await User.create({
      name,
      email,
      password,
      role: 'citizen'
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: createToken(user._id)
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

export const login = async (req, res) => {
  try {
    // Note: Zod middleware is now the primary validation layer; these controller checks act as a fallback.
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Please provide email and password' 
      });
    }

    const user = await User.findOne({ email });
    
    if (!user || !(await user.checkPassword(password))) {
      return res.status(401).json({ 
        message: 'Invalid email or password' 
      });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: createToken(user._id)
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
};