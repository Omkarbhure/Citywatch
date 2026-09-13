import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Otp from '../models/Otp.js';

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

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'User already exists with this email' 
      });
    }

    // Security: Public registration always forces role: 'citizen' to prevent privilege escalation.
    // Authority role assignment must go through a separate, protected/admin-only mechanism in a future phase.
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: 'citizen'
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || '',
      address: user.address || '',
      avatar: user.avatar || '',
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

    const user = await User.findOne({ email: email.toLowerCase() });
    
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
      phone: user.phone || '',
      address: user.address || '',
      avatar: user.avatar || '',
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

export const updateProfile = async (req, res) => {
  try {
    const { name, phone, address, avatar } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    const updatedUser = await User.findById(user._id).select('-password');
    res.json(updatedUser);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const lowerEmail = email.toLowerCase();

    const user = await User.findOne({ email: lowerEmail });
    if (!user) {
      return res.status(404).json({
        message: 'No account registered with this email address'
      });
    }

    // Generate dummy OTP (defaults to '123456')
    const dummyOtp = '123456';

    // Clear any previous OTPs for this email and save new OTP
    await Otp.deleteMany({ email: lowerEmail });
    await Otp.create({
      email: lowerEmail,
      otp: dummyOtp
    });

    console.log(`[AUTH] Dummy OTP for ${lowerEmail}: ${dummyOtp}`);

    res.status(200).json({
      message: 'OTP sent successfully',
      dummyOtp: dummyOtp
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error processing forgot password' });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const lowerEmail = email.toLowerCase();

    const record = await Otp.findOne({ email: lowerEmail, otp });
    if (!record) {
      return res.status(400).json({
        message: 'Invalid or expired OTP'
      });
    }

    res.status(200).json({
      message: 'OTP verified successfully',
      valid: true
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Server error verifying OTP' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const lowerEmail = email.toLowerCase();

    const user = await User.findOne({ email: lowerEmail });
    if (!user) {
      return res.status(404).json({
        message: 'No user found with this email'
      });
    }

    const record = await Otp.findOne({ email: lowerEmail, otp });
    if (!record) {
      return res.status(400).json({
        message: 'Invalid or expired OTP'
      });
    }

    // Set new plain password and trigger mongoose pre-save bcrypt hash
    user.password = newPassword;
    await user.save();

    // Clean up used OTP
    await Otp.deleteMany({ email: lowerEmail });

    res.status(200).json({
      message: 'Password reset successful. You can now log in with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error resetting password' });
  }
};