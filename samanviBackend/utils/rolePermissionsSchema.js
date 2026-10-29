module.exports = [
  `CREATE TABLE IF NOT EXISTS app_roles (
    id INT NOT NULL PRIMARY KEY,
    name VARCHAR(80) NOT NULL UNIQUE,
    d_in TINYINT NOT NULL DEFAULT 0,
    i_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS app_role_permissions (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    role_id INT NOT NULL,
    module_id INT NOT NULL,
    sub_module_id INT NOT NULL,
    can_add TINYINT NOT NULL DEFAULT 0,
    can_edit TINYINT NOT NULL DEFAULT 0,
    can_delete TINYINT NOT NULL DEFAULT 0,
    can_view TINYINT NOT NULL DEFAULT 0,
    can_approve TINYINT NOT NULL DEFAULT 0,
    can_authorize TINYINT NOT NULL DEFAULT 0,
    UNIQUE KEY uq_role_submodule (role_id, sub_module_id),
    KEY idx_role_permissions_submodule (sub_module_id)
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS app_user_roles (
    user_id INT NOT NULL PRIMARY KEY,
    role_id INT NOT NULL,
    assigned_by INT NULL,
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_user_roles_role (role_id)
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS app_user_permission_overrides (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    module_id INT NOT NULL,
    sub_module_id INT NOT NULL,
    can_add TINYINT NOT NULL DEFAULT 0,
    can_edit TINYINT NOT NULL DEFAULT 0,
    can_delete TINYINT NOT NULL DEFAULT 0,
    can_view TINYINT NOT NULL DEFAULT 0,
    can_approve TINYINT NOT NULL DEFAULT 0,
    can_authorize TINYINT NOT NULL DEFAULT 0,
    UNIQUE KEY uq_user_submodule_override (user_id, sub_module_id),
    KEY idx_user_override_submodule (sub_module_id)
  ) ENGINE=InnoDB`,
  `INSERT IGNORE INTO app_roles (id, name) VALUES
    (1, 'Data Entry 1'), (2, 'Data Entry 2'), (3, 'Admin'), (4, 'GM'), (5, 'Super Admin')`,
  `INSERT IGNORE INTO app_role_permissions
    (role_id,module_id,sub_module_id,can_add,can_edit,can_delete,can_view,can_approve,can_authorize)
   SELECT 5,sm.module_id,sm.id,1,1,1,1,1,1 FROM sub_modules sm
   JOIN main_modules mm ON mm.id=sm.module_id WHERE sm.d_in=0 AND mm.d_in=0`,
]
