const User = require('../models/User');
const Patient = require('../models/Patient');
const Provider = require('../models/Provider');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { jwtSecret } = require('../config/config');
const { v4: uuidv4 } = require('uuid');
const emailService = require('./emailService');

// In-memory fallback storage for demo mode
const memoryUsers = [];
const memoryPatients = [];
const memoryProviders = [];

class UserService {
  // Check if MongoDB is available
  async isMongoAvailable() {
    try {
      await User.findOne().limit(1).maxTimeMS(1000);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Register a new user
  async registerUser(userData) {
    try {
      const {
        username,
        email,
        password,
        role = 'patient',
        firstName,
        lastName,
        phone,
        dateOfBirth,
        gender,
        address,
        emergencyContact
      } = userData;

      const isMongoConnected = await this.isMongoAvailable();

      if (isMongoConnected) {
        // Use MongoDB
        const existingUser = await User.findOne({
          $or: [{ email }, { username }]
        });

        if (existingUser) {
          throw new Error('User with this email or username already exists');
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create user
        const user = new User({
          username,
          email,
          password: hashedPassword,
          role,
          firstName,
          lastName,
          phone,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          gender,
          address,
          emergencyContact
        });

        await user.save();

        // Create role-specific profile
        if (role === 'patient') {
          await this.createPatientProfile(user._id);
        } else if (role === 'doctor' || role === 'nurse') {
          await this.createProviderProfile(user._id, role);
        }

        // Send welcome email
        try {
          await emailService.sendWelcomeEmail(user, role);
        } catch (emailError) {
          console.error('Failed to send welcome email:', emailError);
        }

        // Return user without password
        const userResponse = user.toObject();
        delete userResponse.password;

        return {
          success: true,
          data: userResponse,
          message: 'User registered successfully'
        };
      } else {
        // Use in-memory storage for demo
        const existingUser = memoryUsers.find(u => u.email === email || u.username === username);
        if (existingUser) {
          throw new Error('User with this email or username already exists');
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create user
        const user = {
          _id: Date.now().toString(),
          username,
          email,
          password: hashedPassword,
          role,
          firstName,
          lastName,
          phone,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          gender,
          address,
          emergencyContact,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        memoryUsers.push(user);

        // Create role-specific profile
        if (role === 'patient') {
          await this.createPatientProfileMemory(user._id);
        } else if (role === 'doctor' || role === 'nurse') {
          await this.createProviderProfileMemory(user._id, role);
        }

        // Return user without password
        const userResponse = { ...user };
        delete userResponse.password;

        return {
          success: true,
          data: userResponse,
          message: 'User registered successfully (demo mode - data not persisted)'
        };
      }
    } catch (error) {
      throw new Error(`Registration failed: ${error.message}`);
    }
  }

  // Login user
  async loginUser({ email, username, password }) {
    try {
      const isMongoConnected = await this.isMongoAvailable();

      if (isMongoConnected) {
        // Use MongoDB
        const user = await User.findOne({
          $or: [
            { email: email || username },
            { username: username || email }
          ]
        });

        if (!user) {
          throw new Error('Invalid credentials');
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          throw new Error('Invalid credentials');
        }

        // Check if user is active
        if (!user.isActive) {
          throw new Error('Account is deactivated. Please contact support.');
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate JWT token
        const token = jwt.sign(
          {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role
          },
          jwtSecret,
          { expiresIn: '24h' }
        );

        // Return user without password
        const userResponse = user.toObject();
        delete userResponse.password;

        return {
          success: true,
          token,
          user: userResponse,
          message: 'Login successful'
        };
      } else {
        // Use in-memory storage for demo
        const user = memoryUsers.find(u =>
          (u.email === email || u.email === username) ||
          (u.username === username || u.username === email)
        );

        if (!user) {
          throw new Error('Invalid credentials');
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          throw new Error('Invalid credentials');
        }

        // Check if user is active
        if (!user.isActive) {
          throw new Error('Account is deactivated. Please contact support.');
        }

        // Update last login
        user.lastLogin = new Date();

        // Generate JWT token
        const token = jwt.sign(
          {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role
          },
          jwtSecret,
          { expiresIn: '24h' }
        );

        // Return user without password
        const userResponse = { ...user };
        delete userResponse.password;

        return {
          success: true,
          token,
          user: userResponse,
          message: 'Login successful (demo mode)'
        };
      }
    } catch (error) {
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  // Get user profile
  async getUserProfile(userToken) {
    try {
      const isMongoConnected = await this.isMongoAvailable();

      if (isMongoConnected) {
        // Use MongoDB
        const user = await User.findById(userToken.id)
          .select('-password')
          .populate('emergencyContact');

        if (!user) {
          throw new Error('User not found');
        }

        let profileData = { user };

        // Get role-specific profile data
        if (user.role === 'patient') {
          const patient = await Patient.findOne({ userId: user._id })
            .populate('primaryCareProvider');
          profileData.patient = patient;
        } else if (user.role === 'doctor' || user.role === 'nurse') {
          const provider = await Provider.findOne({ userId: user._id });
          profileData.provider = provider;
        }

        return {
          success: true,
          data: profileData,
          message: 'Profile retrieved successfully'
        };
      } else {
        // Use in-memory storage for demo
        const user = memoryUsers.find(u => u._id === userToken.id);
        if (!user) {
          throw new Error('User not found');
        }

        const userResponse = { ...user };
        delete userResponse.password;

        let profileData = { user: userResponse };

        // Get role-specific profile data
        if (user.role === 'patient') {
          const patient = memoryPatients.find(p => p.userId === user._id);
          profileData.patient = patient;
        } else if (user.role === 'doctor' || user.role === 'nurse') {
          const provider = memoryProviders.find(p => p.userId === user._id);
          profileData.provider = provider;
        }

        return {
          success: true,
          data: profileData,
          message: 'Profile retrieved successfully (demo mode)'
        };
      }
    } catch (error) {
      throw new Error(`Failed to get profile: ${error.message}`);
    }
  }

  // Update user profile
  async updateUserProfile(userId, updateData) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Update allowed fields
      const allowedFields = [
        'firstName', 'lastName', 'phone', 'address',
        'emergencyContact', 'profilePicture'
      ];

      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          user[field] = updateData[field];
        }
      });

      await user.save();

      // Return user without password
      const userResponse = user.toObject();
      delete userResponse.password;

      return {
        success: true,
        data: userResponse,
        message: 'Profile updated successfully'
      };
    } catch (error) {
      throw new Error(`Failed to update profile: ${error.message}`);
    }
  }

  // Create patient profile
  async createPatientProfile(userId) {
    try {
      const patient = new Patient({
        userId,
        medicalRecordNumber: `MRN-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
        allergies: [],
        medications: [],
        medicalHistory: [],
        preferences: {
          language: 'en',
          communicationMethod: 'email',
          reminderSettings: {
            appointments: true,
            medications: true,
            checkups: true
          }
        }
      });

      await patient.save();
      return patient;
    } catch (error) {
      console.error('Failed to create patient profile:', error);
      throw error;
    }
  }

  // Create provider profile
  async createProviderProfile(userId, role) {
    try {
      const provider = new Provider({
        userId,
        licenseNumber: `LIC-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        specializations: role === 'doctor' ? ['General Medicine'] : ['Nursing'],
        credentials: role === 'doctor' ? ['MD'] : ['RN'],
        experience: 0,
        availability: {
          monday: { isAvailable: false },
          tuesday: { isAvailable: false },
          wednesday: { isAvailable: false },
          thursday: { isAvailable: false },
          friday: { isAvailable: false },
          saturday: { isAvailable: false },
          sunday: { isAvailable: false }
        },
        isVerified: false,
        isAcceptingNewPatients: true
      });

      await provider.save();
      return provider;
    } catch (error) {
      console.error('Failed to create provider profile:', error);
      throw error;
    }
  }

  // Change password
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const saltRounds = 10;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      user.password = hashedNewPassword;
      await user.save();

      return {
        success: true,
        message: 'Password changed successfully'
      };
    } catch (error) {
      throw new Error(`Failed to change password: ${error.message}`);
    }
  }

  // Deactivate user account
  async deactivateUser(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.isActive = false;
      await user.save();

      return {
        success: true,
        message: 'User account deactivated successfully'
      };
    } catch (error) {
      throw new Error(`Failed to deactivate user: ${error.message}`);
    }
  }

  // Get users by role (for admin purposes)
  async getUsersByRole(role, limit = 10, page = 1) {
    try {
      const skip = (page - 1) * limit;

      const users = await User.find({ role, isActive: true })
        .select('-password')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

      const total = await User.countDocuments({ role, isActive: true });

      return {
        success: true,
        data: users,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw new Error(`Failed to get users: ${error.message}`);
    }
  }

  // Memory-based profile creation methods for demo mode
  async createPatientProfileMemory(userId) {
    try {
      const patient = {
        _id: Date.now().toString() + '_patient',
        userId,
        medicalRecordNumber: `MRN-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
        allergies: [],
        medications: [],
        medicalHistory: [],
        preferences: {
          language: 'en',
          communicationMethod: 'email',
          reminderSettings: {
            appointments: true,
            medications: true,
            checkups: true
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      memoryPatients.push(patient);
      return patient;
    } catch (error) {
      console.error('Failed to create patient profile:', error);
      throw error;
    }
  }

  async createProviderProfileMemory(userId, role) {
    try {
      const provider = {
        _id: Date.now().toString() + '_provider',
        userId,
        licenseNumber: `LIC-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        specializations: role === 'doctor' ? ['General Medicine'] : ['Nursing'],
        credentials: role === 'doctor' ? ['MD'] : ['RN'],
        experience: 0,
        availability: {
          monday: { isAvailable: false },
          tuesday: { isAvailable: false },
          wednesday: { isAvailable: false },
          thursday: { isAvailable: false },
          friday: { isAvailable: false },
          saturday: { isAvailable: false },
          sunday: { isAvailable: false }
        },
        isVerified: false,
        isAcceptingNewPatients: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      memoryProviders.push(provider);
      return provider;
    } catch (error) {
      console.error('Failed to create provider profile:', error);
      throw error;
    }
  }
}

module.exports = new UserService();
