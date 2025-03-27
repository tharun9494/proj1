import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

const GOOGLE_MAPS_API_KEY = 'AIzaSyChfv5hmOMdRzbBWX4P2l9pbZogtuvz8-o';
// Updated coordinates from the provided Google Maps link
const RESTAURANT_LOCATION = {
  lat: 13.5503,
  lng: 78.5007,
  address: "Pitta's Bawarchi, Madanapalle, Andhra Pradesh 517325",
  name: "Pitta's Bawarchi"
};

const Map: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);

  useEffect(() => {
    // Only initialize map if Google Maps is not already loaded
    if (!window.google) {
      // Create a promise to handle script loading
      const loadGoogleMaps = new Promise<void>((resolve, reject) => {
        // Create script element
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
        script.async = true;
        script.defer = true;
        
        // Handle script load and error events
        script.addEventListener('load', () => resolve());
        script.addEventListener('error', () => reject(new Error('Failed to load Google Maps')));
        
        // Append script to document head
        document.head.appendChild(script);
      });

      // Initialize map after script loads
      loadGoogleMaps
        .then(() => initializeMap())
        .catch(error => console.error('Error loading Google Maps:', error));
    } else {
      // Google Maps already loaded, just initialize the map
      initializeMap();
    }

    return () => {
      // Cleanup
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
      }
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const initializeMap = () => {
    if (!mapRef.current || !window.google) return;

    try {
      // Create map instance with custom styling
      const map = new window.google.maps.Map(mapRef.current, {
        center: RESTAURANT_LOCATION,
        zoom: 16,
        mapTypeControl: false,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          },
          {
            featureType: "transit",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          }
        ]
      });

      // Store map instance for cleanup
      mapInstanceRef.current = map;

      // Create and store marker
      const marker = new window.google.maps.Marker({
        position: RESTAURANT_LOCATION,
        map: map,
        title: RESTAURANT_LOCATION.name,
        animation: window.google.maps.Animation.DROP,
        icon: {
          url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
          scaledSize: new window.google.maps.Size(40, 40)
        }
      });
      markerRef.current = marker;

      // Create and store info window
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; max-width: 200px;">
            <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 4px;">
              ${RESTAURANT_LOCATION.name}
            </h3>
            <p style="font-size: 14px; color: #666; margin: 0;">
              ${RESTAURANT_LOCATION.address}
            </p>
            <div style="margin-top: 8px;">
              <a href="https://maps.app.goo.gl/Yok4v5R5DEQ2FRd58" 
                 target="_blank" 
                 style="color: #1a73e8; text-decoration: none; font-size: 14px;">
                View on Google Maps
              </a>
            </div>
          </div>
        `
      });
      infoWindowRef.current = infoWindow;

      // Show info window by default
      infoWindow.open(map, marker);

      // Add click listener to marker
      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

    } catch (error) {
      console.error('Error initializing map:', error);
    }
  };

  return (
    <div 
      ref={mapRef} 
      className="w-full h-full rounded-lg shadow-md overflow-hidden"
      style={{ minHeight: '400px' }}
    />
  );
};

export default Map;