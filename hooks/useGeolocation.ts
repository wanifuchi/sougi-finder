
import { useState, useEffect } from 'react';

interface Position {
  latitude: number;
  longitude: number;
}

interface GeolocationState {
  loading: boolean;
  error: string | null;
  position: Position | null;
}

export const useGeolocation = (): GeolocationState => {
  const [state, setState] = useState<GeolocationState>({
    loading: true,
    error: null,
    position: null,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({
        loading: false,
        error: 'Geolocation is not supported by your browser.',
        position: null,
      });
      return;
    }

    const onSuccess = (position: GeolocationPosition) => {
      setState({
        loading: false,
        error: null,
        position: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        },
      });
    };

    const onError = (error: GeolocationPositionError) => {
      setState({
        loading: false,
        error: error.message,
        position: null,
      });
    };

    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
};
