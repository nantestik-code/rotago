DROP POLICY IF EXISTS "read_non_secret_settings" ON system_settings;
DROP POLICY IF EXISTS "admin_write_settings" ON system_settings;

CREATE POLICY "read_public_system_settings_authenticated" ON system_settings
  FOR SELECT
  TO authenticated
  USING (is_secret = false);

CREATE POLICY "manage_system_settings_admin_only" ON system_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin', 'moderator')
    )
  );
