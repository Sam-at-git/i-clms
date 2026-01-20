import { User } from '../state';

/**
 * Parse GraphQL error to get user-friendly message
 */
export const parseLoginError = (error: any): string => {
  const message = error?.message || '';

  // Check for specific error patterns
  if (message.includes('Invalid credentials') || message.includes('Unauthorized')) {
    return '邮箱或密码错误';
  }

  if (message.includes('User not found')) {
    return '用户不存在';
  }

  if (message.includes('disabled') || message.includes('inactive')) {
    return '账户已被禁用，请联系管理员';
  }

  if (message.includes('must change password')) {
    return '首次登录需要修改密码';
  }

  // Default error message
  return message || '登录失败，请稍后重试';
};

/**
 * Check if user has specific role
 */
export const hasRole = (user: User | null, role: string): boolean => {
  return user?.role === role;
};

/**
 * Check if user is admin
 */
export const isAdmin = (user: User | null): boolean => {
  return hasRole(user, 'ADMIN');
};

/**
 * Check if user is department admin
 */
export const isDeptAdmin = (user: User | null): boolean => {
  return hasRole(user, 'DEPT_ADMIN');
};

/**
 * Check if user has any admin role
 */
export const isAdminUser = (user: User | null): boolean => {
  return isAdmin(user) || isDeptAdmin(user);
};

/**
 * Check if user can access department data
 */
export const canAccessDepartment = (
  user: User | null,
  departmentId: string
): boolean => {
  if (!user) return false;
  // Admin can access all departments
  if (isAdmin(user)) return true;
  // Dept admin and regular users can only access their own department
  return user.department.id === departmentId;
};

/**
 * Get user display name
 */
export const getUserName = (user: User | null): string => {
  return user?.name || '未知用户';
};

/**
 * Get user department name
 */
export const getUserDepartment = (user: User | null): string => {
  return user?.department?.name || '未知部门';
};

/**
 * Format user role for display
 */
export const formatUserRole = (role: string): string => {
  const roleMap: Record<string, string> = {
    ADMIN: '系统管理员',
    DEPT_ADMIN: '部门管理员',
    USER: '普通用户',
  };
  return roleMap[role] || role;
};
