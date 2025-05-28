const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
  // Check if admin user already exists
  const existingAdmin = await knex('users').where('username', 'admin').first();
  
  if (!existingAdmin) {
    // Hash the default password
    const passwordHash = await bcrypt.hash('admin123', 12);
    
    // Insert admin user
    await knex('users').insert({
      username: 'admin',
      email: 'admin@example.com',
      password_hash: passwordHash,
      first_name: 'Admin',
      last_name: 'User',
      is_active: true
    });
    
    console.log('Admin user created:');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('Email: admin@example.com');
  }
}; 