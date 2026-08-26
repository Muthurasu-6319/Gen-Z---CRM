const fs = require('fs');
const paths = ['server/routes/projects.js', 'server/routes/users.js', 'server/routes/leads.js'];
paths.forEach(p => {
  let c = fs.readFileSync(p, 'utf8');
  c = c.replace(/\\`/g, '`');
  c = c.replace(/\\\$/g, '$');
  fs.writeFileSync(p, c);
});
console.log('Fixed escaped backticks');
