const { Client } = require('../platform/node_modules/pg');

async function updateLogos() {
  const c = new Client({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_commerce' });
  await c.connect();

  const logos = {
    'alpha-books': 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
    'nxb-kim-dong': 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=400&q=80',
    'nha-nam-books': 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80',
    'fahasa': 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=400&q=80',
    'nha-xuat-ban-tre': 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=400&q=80',
    'tri-tue-viet-books': 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=400&q=80'
  };

  for (const [slug, logo] of Object.entries(logos)) {
    await c.query('UPDATE publishers SET logo = $1 WHERE slug = $2', [logo, slug]);
  }

  const res = await c.query('SELECT name, slug, logo FROM publishers');
  console.log('✅ Updated publishers logos in huki_commerce:');
  console.log(res.rows);
  await c.end();
}

updateLogos().catch(console.error);

