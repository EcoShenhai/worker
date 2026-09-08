import { Link } from 'react-router-dom';
import { PageHead } from '../components/ui.jsx';

export default function NotFound() {
  return (
    <>
      <PageHead title="Page not found" subtitle="That page does not exist in this workspace." />
      <Link className="btn" to="/">Return to dashboard</Link>
    </>
  );
}
