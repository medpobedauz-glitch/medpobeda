export async function setBookmark(questionId, bookmarked) {
  const me = await fetch('/api/auth/me', { credentials: 'same-origin' });
  if (!me.ok) throw new Error('Please sign in to use bookmarks.');
  const { csrfToken } = await me.json();
  const res = await fetch('/api/auth/bookmarks/' + encodeURIComponent(questionId), {
    method: bookmarked ? 'PUT' : 'DELETE', credentials: 'same-origin',
    headers: { 'X-CSRF-Token': csrfToken },
  });
  if (!res.ok) throw new Error('Could not save bookmark. Please try again.');
  return (await res.json()).bookmarked;
}
