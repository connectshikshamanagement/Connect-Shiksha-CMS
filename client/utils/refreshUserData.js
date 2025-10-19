// Utility function to refresh user data from server
export const refreshUserData = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return false;

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const userData = await response.json();
      if (userData.success) {
        localStorage.setItem('user', JSON.stringify(userData.data));
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Error refreshing user data:', error);
    return false;
  }
};

// Function to check if user needs to re-login
export const checkUserRoleStatus = () => {
  const user = localStorage.getItem('user');
  if (!user) return false;

  try {
    const userData = JSON.parse(user);
    const roles = userData.roleIds || [];
    
    // Check if user has the new role structure
    const hasNewRoles = roles.some(role => 
      ['FOUNDER', 'TEAM_MANAGER', 'TEAM_MEMBER'].includes(role.key)
    );
    
    return hasNewRoles;
  } catch (error) {
    console.error('Error checking user role status:', error);
    return false;
  }
};
