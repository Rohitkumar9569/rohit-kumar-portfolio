// File: server/src/routes/auth.ts
import { Router } from 'express';
import User, { adminPermissionKeys } from '../models/User';
import SavedResource from '../models/SavedResource';
import UserPreference from '../models/UserPreference';
import jwt from 'jsonwebtoken';
import { authLimiter } from '../middleware/security';
import { protect, requireAdmin, type AuthRequest } from '../middleware/auth';
import { cleanString, isValidEmail, isValidObjectId, isValidSlug } from '../utils/validation';

const router = Router();

type AuthRole = 'admin' | 'user';
type AdminPermissionKey = typeof adminPermissionKeys[number];

type GoogleTokenInfo = {
  aud?: string;
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
};

const createToken = (id: string, role: AuthRole) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) return null;

  return jwt.sign(
    { id, role },
    jwtSecret,
    { expiresIn: '1d' },
  );
};

const getAllowedGoogleClientIds = () => (
  process.env.GOOGLE_CLIENT_IDS ||
  process.env.GOOGLE_CLIENT_ID ||
  process.env.VITE_GOOGLE_CLIENT_ID ||
  ''
)
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const verifyGoogleCredential = async (credential: string): Promise<GoogleTokenInfo | null> => {
  const allowedClientIds = getAllowedGoogleClientIds();
  if (!allowedClientIds.length) {
    throw new Error('GOOGLE_CLIENT_ID is not configured.');
  }

  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
  );
  if (!response.ok) return null;

  const tokenInfo = await response.json() as GoogleTokenInfo;
  const emailVerified = tokenInfo.email_verified === true || tokenInfo.email_verified === 'true';
  if (!tokenInfo.sub || !tokenInfo.email || !tokenInfo.aud || !emailVerified) return null;
  if (!allowedClientIds.includes(tokenInfo.aud)) return null;

  return tokenInfo;
};

const getQueryString = (value: unknown, maxLength = 120) => {
  if (Array.isArray(value)) return cleanString(value[0], maxLength);
  return cleanString(value, maxLength);
};

const getQueryNumber = (value: unknown, fallback: number, max: number) => {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
};

const normalizeRole = (value: unknown): AuthRole | null => {
  const role = cleanString(value, 20).toLowerCase();
  return role === 'admin' || role === 'user' ? role : null;
};

const normalizeAdminScope = (value: any) => {
  const enabled = Boolean(value?.enabled);
  if (!enabled) {
    return {
      enabled: false,
      rootCardIds: [],
      permissions: [],
      examSlugs: [],
      updatedAt: new Date(),
    };
  }

  const validPermissions = new Set<AdminPermissionKey>(adminPermissionKeys);
  const rootCardIds = Array.from(new Set(
    (Array.isArray(value?.rootCardIds) ? value.rootCardIds : [])
      .map((item: unknown) => cleanString(item, 80))
      .filter(isValidObjectId)
  ));
  const permissions = Array.from(new Set(
    (Array.isArray(value?.permissions) ? value.permissions : [])
      .map((item: unknown) => cleanString(item, 60))
      .filter((permission: string): permission is AdminPermissionKey => validPermissions.has(permission as AdminPermissionKey))
  ));
  const examSlugs = Array.from(new Set(
    (Array.isArray(value?.examSlugs) ? value.examSlugs : [])
      .map((item: unknown) => cleanString(item, 80).toLowerCase())
      .filter((slug: string) => Boolean(slug) && isValidSlug(slug))
  ));

  return {
    enabled: true,
    rootCardIds,
    permissions,
    examSlugs,
    updatedAt: new Date(),
  };
};

const serializeAdminScope = (account: any) => {
  const scope = account.adminScope || {};
  return {
    enabled: Boolean(scope.enabled),
    rootCardIds: Array.isArray(scope.rootCardIds)
      ? scope.rootCardIds.map((id: any) => id?._id?.toString?.() || id?.toString?.() || String(id)).filter(Boolean)
      : [],
    permissions: Array.isArray(scope.permissions) ? scope.permissions : [],
    examSlugs: Array.isArray(scope.examSlugs) ? scope.examSlugs : [],
    updatedAt: scope.updatedAt,
  };
};

const serializeAccount = (account: any) => ({
  _id: account._id?.toString?.() || account.id || String(account._id),
  email: account.email,
  role: account.role === 'admin' ? 'admin' : 'user',
  name: account.name || '',
  avatarUrl: account.avatarUrl || '',
  authProvider: account.authProvider || 'password',
  googleLinked: Boolean(account.googleId),
  createdAt: account.createdAt,
  updatedAt: account.updatedAt,
  adminScope: serializeAdminScope(account),
});

const isLastAdmin = async (userId: unknown) => {
  const adminCount = await User.countDocuments({ role: 'admin' });
  if (adminCount > 1) return false;
  const user = await User.findById(userId).select('role').lean();
  return user?.role === 'admin';
};

const ensureUserManagementPermission = async (req: AuthRequest, res: any) => {
  const actorId = req.user?.id;
  if (!actorId || !isValidObjectId(actorId)) {
    res.status(403).json({ message: 'Admin session is required.' });
    return false;
  }
  const actor = await User.findById(actorId).select('role adminScope').lean();
  const scope = (actor as any)?.adminScope;
  if (actor?.role === 'admin' && scope?.enabled && !Array.isArray(scope.permissions)) {
    res.status(403).json({ message: 'This admin cannot manage users.' });
    return false;
  }
  if (actor?.role === 'admin' && scope?.enabled && !scope.permissions.includes('users:manage')) {
    res.status(403).json({ message: 'This admin cannot manage users.' });
    return false;
  }
  return true;
};

/**
 * @route   GET /api/auth/google/config
 * @desc    Return the public Google client ID used by login pages.
 * @access  Public
 */
router.get('/google/config', (_req, res) => {
  const [clientId] = getAllowedGoogleClientIds();
  return res.status(200).json({ clientId: clientId || '' });
});

router.get('/admin/users', protect, requireAdmin, async (req, res) => {
  try {
    if (!(await ensureUserManagementPermission(req as AuthRequest, res))) return;
    const q = getQueryString(req.query.q, 120);
    const role = getQueryString(req.query.role, 20).toLowerCase();
    const provider = getQueryString(req.query.provider, 20).toLowerCase();
    const limit = getQueryNumber(req.query.limit, 100, 500);

    const filter: Record<string, unknown> = {};
    if (role === 'admin' || role === 'user') filter.role = role;
    if (provider === 'password' || provider === 'google') filter.authProvider = provider;
    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ email: regex }, { name: regex }];
    }

    const users = await User.find(filter)
      .select('email role name avatarUrl googleId authProvider adminScope createdAt updatedAt')
      .sort({ role: 1, createdAt: -1 })
      .limit(limit)
      .lean();

    const userIds = users.map((user: any) => user._id);

    const libraryStats = await SavedResource.aggregate([
      { $match: { userId: { $in: userIds } } },
      {
        $group: {
          _id: '$userId',
          total: { $sum: 1 },
          saved: { $sum: { $cond: [{ $eq: ['$status', 'saved'] }, 1, 0] } },
          bookmarked: { $sum: { $cond: [{ $eq: ['$status', 'bookmarked'] }, 1, 0] } },
          downloaded: { $sum: { $cond: [{ $eq: ['$status', 'downloaded'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          offline: { $sum: { $cond: ['$offline.available', 1, 0] } },
          lastActivityAt: { $max: '$updatedAt' },
        },
      },
    ]);

    const preferences = await UserPreference.find({ userId: { $in: userIds } })
      .populate('activeWorkspaceId', 'name shortName slug type')
      .populate('selectedWorkspaceIds', 'name shortName slug type')
      .lean();

    const libraryStatsByUser = new Map(
      libraryStats.map((item: any) => [item._id?.toString?.() || String(item._id), item])
    );
    const preferenceByUser = new Map(
      preferences.map((preference: any) => [preference.userId?.toString?.() || String(preference.userId), preference])
    );

    res.json(users.map((user: any) => {
      const userId = user._id?.toString?.() || String(user._id);
      const stats = libraryStatsByUser.get(userId) || {};
      const preference = preferenceByUser.get(userId);

      return {
        _id: userId,
        email: user.email,
        role: user.role,
        name: user.name || '',
        avatarUrl: user.avatarUrl || '',
        authProvider: user.authProvider || 'password',
        googleLinked: Boolean(user.googleId),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        adminScope: serializeAdminScope(user),
        library: {
          total: stats.total || 0,
          saved: stats.saved || 0,
          bookmarked: stats.bookmarked || 0,
          downloaded: stats.downloaded || 0,
          completed: stats.completed || 0,
          offline: stats.offline || 0,
          lastActivityAt: stats.lastActivityAt,
        },
        preference: preference ? {
          language: preference.language,
          activePhase: preference.activePhase || '',
          onboardingCompleted: Boolean(preference.onboardingCompleted),
          selectedSubjects: preference.selectedSubjects || [],
          preferredResourceTypes: preference.preferredResourceTypes || [],
          activeWorkspace: preference.activeWorkspaceId || null,
          selectedWorkspaces: preference.selectedWorkspaceIds || [],
          interviewProfile: preference.interviewProfile || {},
          updatedAt: preference.updatedAt,
        } : null,
      };
    }));
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching admin users.' });
  }
});

router.post('/admin/users', protect, requireAdmin, async (req, res) => {
  try {
    if (!(await ensureUserManagementPermission(req as AuthRequest, res))) return;
    const email = cleanString(req.body.email, 254).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const name = cleanString(req.body.name, 120);
    const role = normalizeRole(req.body.role) || 'user';

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ message: 'A valid email is required.' });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    const existingUser = await User.findOne({ email }).select('_id').lean();
    if (existingUser) {
      return res.status(409).json({ message: 'This email is already in use.' });
    }

    const user = new User({
      email,
      password,
      name,
      role,
      authProvider: 'password',
      adminScope: role === 'admin' ? normalizeAdminScope(req.body.adminScope) : normalizeAdminScope(null),
    });
    await user.save();

    return res.status(201).json(serializeAccount(user));
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'This email is already in use.' });
    }
    return res.status(500).json({ message: 'Server error while creating user.' });
  }
});

router.patch('/admin/users/:id', protect, requireAdmin, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    if (!(await ensureUserManagementPermission(authReq, res))) return;
    const targetId = req.params.id;
    if (!isValidObjectId(targetId)) {
      return res.status(400).json({ message: 'Invalid user id.' });
    }

    const user = await User.findById(targetId);
    if (!user) {
      return res.status(404).json({ message: 'Account not found.' });
    }

    const nextName = cleanString(req.body.name, 120);
    const nextEmail = cleanString(req.body.email, 254).toLowerCase();
    const nextRole = normalizeRole(req.body.role);
    const nextPassword = typeof req.body.password === 'string' ? req.body.password : '';

    if (Object.prototype.hasOwnProperty.call(req.body, 'name')) {
      user.name = nextName;
    }

    if (nextEmail) {
      if (!isValidEmail(nextEmail)) {
        return res.status(400).json({ message: 'A valid email is required.' });
      }
      if (nextEmail !== user.email) {
        const existingUser = await User.findOne({ email: nextEmail, _id: { $ne: user._id } }).select('_id').lean();
        if (existingUser) {
          return res.status(409).json({ message: 'This email is already in use.' });
        }
        user.email = nextEmail;
      }
    }

    if (nextRole) {
      if (user.role === 'admin' && nextRole !== 'admin') {
        if (authReq.user?.id === targetId) {
          return res.status(400).json({ message: 'You cannot remove admin from your own account.' });
        }
        if (await isLastAdmin(user._id)) {
          return res.status(400).json({ message: 'At least one admin account is required.' });
        }
      }
      user.role = nextRole;
      if (nextRole !== 'admin') {
        user.adminScope = normalizeAdminScope(null) as any;
      }
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'adminScope')) {
      const intendedRole = nextRole || user.role;
      if (intendedRole !== 'admin') {
        user.adminScope = normalizeAdminScope(null) as any;
      } else {
        if (authReq.user?.id === targetId && Boolean(req.body.adminScope?.enabled)) {
          return res.status(400).json({ message: 'You cannot restrict your own admin scope.' });
        }
        user.adminScope = normalizeAdminScope(req.body.adminScope) as any;
      }
    }

    if (nextPassword) {
      if (nextPassword.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters.' });
      }
      user.password = nextPassword;
      user.authProvider = user.googleId ? 'password' : user.authProvider;
    }

    await user.save();
    return res.json(serializeAccount(user));
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'This email is already in use.' });
    }
    return res.status(500).json({ message: 'Server error while updating user.' });
  }
});

router.delete('/admin/users/:id', protect, requireAdmin, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    if (!(await ensureUserManagementPermission(authReq, res))) return;
    const targetId = req.params.id;
    if (!isValidObjectId(targetId)) {
      return res.status(400).json({ message: 'Invalid user id.' });
    }

    if (authReq.user?.id === targetId) {
      return res.status(400).json({ message: 'You cannot delete your own admin session account.' });
    }

    const user = await User.findById(targetId).select('role');
    if (!user) {
      return res.status(404).json({ message: 'Account not found.' });
    }

    if (await isLastAdmin(user._id)) {
      return res.status(400).json({ message: 'At least one admin account is required.' });
    }

    await Promise.all([
      User.deleteOne({ _id: targetId }),
      UserPreference.deleteMany({ userId: targetId }),
      SavedResource.deleteMany({ userId: targetId }),
    ]);

    return res.json({ deleted: true });
  } catch {
    return res.status(500).json({ message: 'Server error while deleting user.' });
  }
});

router.get('/me', protect, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const user = await User.findById(authReq.user?.id)
      .select('email role name avatarUrl googleId authProvider adminScope createdAt updatedAt')
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'Account not found.' });
    }
    const account = user as any;

    return res.json({
      _id: account._id?.toString?.() || String(account._id),
      email: account.email,
      role: account.role,
      name: account.name || '',
      avatarUrl: account.avatarUrl || '',
      authProvider: account.authProvider || 'password',
      googleLinked: Boolean(account.googleId),
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
      adminScope: serializeAdminScope(account),
    });
  } catch {
    return res.status(500).json({ message: 'Server error while loading profile.' });
  }
});

router.patch('/me', protect, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const user = await User.findById(authReq.user?.id);

    if (!user) {
      return res.status(404).json({ message: 'Account not found.' });
    }

    const nextName = cleanString(req.body.name, 120);
    const nextEmail = cleanString(req.body.email, 254).toLowerCase();
    const currentPassword = typeof req.body.currentPassword === 'string' ? req.body.currentPassword : '';
    const nextPassword = typeof req.body.newPassword === 'string' ? req.body.newPassword : '';
    const wantsEmailChange = Boolean(nextEmail && nextEmail !== user.email);
    const wantsPasswordChange = Boolean(nextPassword);

    if (nextEmail && !isValidEmail(nextEmail)) {
      return res.status(400).json({ message: 'A valid email is required.' });
    }

    if (wantsPasswordChange && nextPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    if ((wantsEmailChange || wantsPasswordChange) && user.password) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required for secure updates.' });
      }

      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(401).json({ message: 'Current password is incorrect.' });
      }
    }

    if (wantsEmailChange) {
      const existingUser = await User.findOne({ email: nextEmail, _id: { $ne: user._id } }).select('_id').lean();
      if (existingUser) {
        return res.status(409).json({ message: 'This email is already in use.' });
      }
      user.email = nextEmail;
    }

    user.name = nextName;
    if (wantsPasswordChange) {
      user.password = nextPassword;
      user.authProvider = user.googleId ? 'password' : user.authProvider;
    }

    await user.save();
    const account = user as any;

    return res.json({
      _id: account.id,
      email: account.email,
      role: account.role,
      name: account.name || '',
      avatarUrl: account.avatarUrl || '',
      authProvider: account.authProvider || 'password',
      googleLinked: Boolean(account.googleId),
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'This email is already in use.' });
    }
    return res.status(500).json({ message: 'Server error while updating profile.' });
  }
});

/**
 * @route   POST /api/auth/register
 * @desc    Register the first admin user. Disables after one user exists.
 * @access  Public (for setup only)
 */
router.post('/register', authLimiter, async (req, res) => {
  try {
    const email = cleanString(req.body.email, 254).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    // IMPORTANT: This check prevents anyone else from creating an admin account.
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      return res.status(403).json({ message: 'Admin account already exists. Registration is disabled.' });
    }

    if (!email || !password || !isValidEmail(email) || password.length < 8) {
      return res.status(400).json({ message: 'A valid email and an 8+ character password are required.' });
    }

    const user = new User({ email, password, role: 'admin' });
    await user.save();

    res.status(201).json({ message: 'Admin user created successfully.' });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Admin user already exists.' });
    }
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

/**
 * @route   POST /api/auth/student/register
 * @desc    Create a normal student account and return a JWT
 * @access  Public
 */
router.post('/student/register', authLimiter, async (req, res) => {
  try {
    const email = cleanString(req.body.email, 254).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const name = cleanString(req.body.name, 120);

    if (!email || !password || !isValidEmail(email) || password.length < 8) {
      return res.status(400).json({ message: 'A valid email and an 8+ character password are required.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const user = new User({
      email,
      password,
      name,
      role: 'user',
      authProvider: 'password',
    });
    await user.save();

    const token = createToken(user.id, 'user');
    if (!token) {
      return res.status(500).json({ message: 'Authentication is not configured.' });
    }

    return res.status(201).json({ token });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    return res.status(500).json({ message: 'Server error during account creation.' });
  }
});

/**
 * @route   POST /api/auth/google
 * @desc    Sign in with Google. Student portal can create users; admin portal only accepts existing admins.
 * @access  Public
 */
router.post('/google', authLimiter, async (req, res) => {
  try {
    const credential = typeof req.body.credential === 'string' ? req.body.credential : '';
    const portal = cleanString(req.body.portal, 20).toLowerCase();

    if (!credential) {
      return res.status(400).json({ message: 'Google credential is required.' });
    }

    if (portal !== 'student' && portal !== 'admin') {
      return res.status(400).json({ message: 'Invalid login portal.' });
    }

    const googleProfile = await verifyGoogleCredential(credential);
    if (!googleProfile) {
      return res.status(401).json({ message: 'Google sign-in could not be verified.' });
    }

    const email = googleProfile.email!.toLowerCase();
    let user = await User.findOne({ email });

    if (portal === 'admin') {
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access only.' });
      }

      user.googleId = user.googleId || googleProfile.sub;
      user.name = user.name || cleanString(googleProfile.name, 120);
      user.avatarUrl = user.avatarUrl || cleanString(googleProfile.picture, 500);
      await user.save();

      const token = createToken(user.id, 'admin');
      if (!token) {
        return res.status(500).json({ message: 'Authentication is not configured.' });
      }

      return res.status(200).json({ token });
    }

    if (user?.role === 'admin') {
      return res.status(403).json({ message: 'Admin accounts must use the admin login page.' });
    }

    if (!user) {
      user = new User({
        email,
        role: 'user',
        name: cleanString(googleProfile.name, 120),
        avatarUrl: cleanString(googleProfile.picture, 500),
        googleId: googleProfile.sub,
        authProvider: 'google',
      });
    } else {
      user.googleId = user.googleId || googleProfile.sub;
      user.name = user.name || cleanString(googleProfile.name, 120);
      user.avatarUrl = user.avatarUrl || cleanString(googleProfile.picture, 500);
      user.authProvider = user.authProvider === 'password' ? 'password' : 'google';
    }

    await user.save();

    const token = createToken(user.id, 'user');
    if (!token) {
      return res.status(500).json({ message: 'Authentication is not configured.' });
    }

    return res.status(200).json({ token });
  } catch (error: any) {
    if (error.message === 'GOOGLE_CLIENT_ID is not configured.') {
      return res.status(500).json({ message: 'Google sign-in is not configured.' });
    }
    if (error.code === 11000) {
      return res.status(409).json({ message: 'This Google account is already linked.' });
    }
    return res.status(500).json({ message: 'Server error during Google sign-in.' });
  }
});


/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return a JWT
 * @access  Public
 */
router.post('/login', authLimiter, async (req, res) => {
  try {
    const email = cleanString(req.body.email, 254).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const portal = cleanString(req.body.portal, 20).toLowerCase();

    if (!email || !password || !isValidEmail(email)) {
      return res.status(400).json({ message: 'Valid email and password are required.' });
    }

    if (portal !== 'student' && portal !== 'admin') {
      return res.status(400).json({ message: 'Invalid login portal.' });
    }

    // Find the user by their email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Use the 'comparePassword' method we created in the model
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const userRole = user.role === 'admin' ? 'admin' : 'user';
    if (portal === 'student' && userRole === 'admin') {
      return res.status(403).json({ message: 'Admin accounts must use the admin login page.' });
    }

    if (portal === 'admin' && userRole !== 'admin') {
      return res.status(403).json({ message: 'Admin access only.' });
    }

    // If credentials are correct, create the JWT
    const token = createToken(user.id, userRole);
    if (!token) {
      return res.status(500).json({ message: 'Authentication is not configured.' });
    }

    res.status(200).json({ token });

  } catch (error: any) {
    res.status(500).json({ message: 'Server error during login.' });
  }
});


export default router;
