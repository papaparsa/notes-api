import { useEffect, useState } from 'react';
import { fetchJSON, buildQuery } from '../lib/api';

export default function useTrendingHashtags(workspaceSlug) {
  const [hashtags, setHashtags] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchJSON(`/api/note/hashtags/trending/${buildQuery({ workspace: workspaceSlug })}`)
      .then((data) => alive && setHashtags(Array.isArray(data) ? data : []))
      .catch(() => alive && setHashtags([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [workspaceSlug]);
  return { hashtags, loading };
}
