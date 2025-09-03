import { useNavigate, useParams } from '@remix-run/react';
import { useEffect } from 'react';
import Spinner from '~/components/ui/Spinner';
import { NAV_ITEMS } from '~/lib/nav';
import { getLocalStore } from '~/lib/utils';

/**
 * if user clicks a navbar link(with herd code) too fast after the page loads. 
 * the nav link points to this route because herdcode is not loaded yet.
 */

export default function Page() {
  const params = useParams();
  const navigate = useNavigate();
  useEffect(() => {
    const idx = NAV_ITEMS.findIndex((ni) => ni.id === 'herduuid' && ni.type === params.path);
    if (idx !== -1) {
      const herdUuid = getLocalStore<string>('herdUuid');
      if (herdUuid) {
        navigate(`/dashboard/${params.path}/${herdUuid}`, { replace: true });
      }
    }
  }, [params.path, navigate]);

  return <Spinner />;
}
