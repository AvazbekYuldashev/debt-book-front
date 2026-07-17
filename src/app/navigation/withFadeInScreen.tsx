import React from 'react';
import FadeInView from '../../shared/ui/FadeInView';

export function withFadeInScreen<P extends object>(Component: React.ComponentType<P>): React.FC<P> {
  const WrappedScreen: React.FC<P> = (props) => (
    <FadeInView style={{ flex: 1 }}>
      <Component {...props} />
    </FadeInView>
  );

  WrappedScreen.displayName = `WithFadeIn(${Component.displayName || Component.name || 'Screen'})`;
  return WrappedScreen;
}
