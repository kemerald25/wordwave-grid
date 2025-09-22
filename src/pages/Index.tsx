import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const Index = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect to lobby immediately
    navigate('/lobby');
  }, [navigate]);

  return null;
};

export default Index;
