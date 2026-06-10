def get_user_role(user):
    """
    Resolve the highest priority role name for a given User object.
    Priority order: SUPER_ADMIN (if superuser) -> ADMIN -> HR -> DEPT_MANAGER -> EMPLOYEE.
    """
    if not user or user.is_anonymous:
        return 'EMPLOYEE'

    if user.is_superuser:
        return 'SUPER_ADMIN'

    role_priority = ['ADMIN', 'HR', 'DEPT_MANAGER', 'EMPLOYEE']
    try:
        employee_profile = getattr(user, 'employee_profile', None)
        if not employee_profile:
            return 'EMPLOYEE'

        role_names = (
            employee_profile.roles
            .select_related('role')
            .values_list('role__role_name', flat=True)
        )
        normalized = {str(name).strip().upper() for name in role_names if name}
        for role in role_priority:
            if role in normalized:
                return role
        return 'EMPLOYEE'
    except Exception:
        return 'EMPLOYEE'
