async function verifyUat() {
  console.log('=== VERIFYING UAT ENVIRONMENT ===\n');

  // 1. Health check
  try {
    const healthRes = await fetch('https://huki-uat.duckdns.org/api/v1/health/live');
    const health = await healthRes.json();
    console.log('[1] Health check:', health.status, health.data?.service);
  } catch (err) {
    console.error('[1] Health check failed:', err.message);
  }

  // 2. Books API & Author/Publisher sync check
  try {
    const booksRes = await fetch('https://huki-uat.duckdns.org/api/v1/books?limit=100');
    const booksJson = await booksRes.json();
    const books = booksJson.data || [];
    console.log('[2] Books endpoint: Total fetched =', books.length);

    const nullAuthors = books.filter(b => !b.author || !b.author.name);
    const nullPublishers = books.filter(b => !b.publisher || !b.publisher.name);
    console.log('[2.1] Books with NULL author:', nullAuthors.length);
    console.log('[2.2] Books with NULL publisher:', nullPublishers.length);
    if (nullAuthors.length > 0) {
      console.log('Sample null author books:', nullAuthors.slice(0, 3).map(b => b.title));
    }
    if (nullPublishers.length > 0) {
      console.log('Sample null publisher books:', nullPublishers.slice(0, 3).map(b => b.title));
    }
  } catch (err) {
    console.error('[2] Books endpoint failed:', err.message);
  }

  // 3. Check specific book that was previously null author
  try {
    const res = await fetch('https://huki-uat.duckdns.org/api/v1/books?search=Tuoi%20Tre%20Dang%20Gia%20Bao%20Nhieu');
    const json = await res.json();
    const book = json.data?.[0];
    if (book) {
      console.log('[3] Auto-healed book:', book.title);
      console.log('    Author:', book.author?.name);
      console.log('    Publisher:', book.publisher?.name);
    }
  } catch (err) {
    console.error('[3] Book search failed:', err.message);
  }

  // 4. Non-existent book ID check (ensuring no Bill Gates mock fallback on UAT)
  try {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const fakeRes = await fetch('https://huki-uat.duckdns.org/api/v1/books/' + fakeId);
    console.log('[4] Non-existent book response status:', fakeRes.status);
    const fakeJson = await fakeRes.json();
    console.log('    Status/Message:', fakeJson.statusCode || fakeJson.status, fakeJson.message);
  } catch (err) {
    console.error('[4] Non-existent book check failed:', err.message);
  }

  // 5. Frontend Web live checks
  try {
    const webHome = await fetch('https://huki-uat.duckdns.org');
    console.log('[5.1] Frontend Homepage status:', webHome.status);
    const webBooks = await fetch('https://huki-uat.duckdns.org/books');
    console.log('[5.2] Frontend /books status:', webBooks.status);
    const webLibrary = await fetch('https://huki-uat.duckdns.org/library');
    console.log('[5.3] Frontend /library status:', webLibrary.status);
  } catch (err) {
    console.error('[5] Frontend checks failed:', err.message);
  }

  console.log('\n=== UAT VERIFICATION FINISHED ===');
}

verifyUat();
