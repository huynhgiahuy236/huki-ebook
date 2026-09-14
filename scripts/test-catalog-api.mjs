async function testCatalogApi() {
  console.log('Testing GET /categories/tree...');
  const catRes = await fetch('http://localhost:3000/api/v1/categories/tree').catch(() => null);
  if (catRes) {
    const data = await catRes.json();
    console.log('Categories count:', data.data?.length);
    console.log('Sample category:', data.data?.[0]);
  }

  console.log('Testing GET /authors...');
  const autRes = await fetch('http://localhost:3000/api/v1/authors?limit=5').catch(() => null);
  if (autRes) {
    const data = await autRes.json();
    console.log('Authors count:', data.data?.length);
    console.log('Sample author:', data.data?.[0]);
  }

  console.log('Testing GET /publishers...');
  const pubRes = await fetch('http://localhost:3000/api/v1/publishers?limit=5').catch(() => null);
  if (pubRes) {
    const data = await pubRes.json();
    console.log('Publishers count:', data.data?.length);
    console.log('Sample publisher:', data.data?.[0]);
  }
}

testCatalogApi();
