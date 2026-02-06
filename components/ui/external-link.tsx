import { Href, Link } from 'expo-router';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { type ComponentProps } from 'react';

type Props = Omit<ComponentProps<typeof Link>, 'href'> & { href: Href & string };

export function ExternalLink(props: Props) {
  const { href, onPress: parentOnPress, ...rest } = props;

  return (
    <Link
      target="_blank"
      {...rest}
      href={href}
      onPress={async (event) => {
        if (parentOnPress) {
          try {
            await parentOnPress(event);
          } catch (error) {
            console.error('External link onPress handler failed:', error);
          }
        }

        if (event.defaultPrevented) {
          return;
        }

        if (process.env.EXPO_OS !== 'web') {
          // Prevent the default behavior of linking to the default browser on native.
          event.preventDefault();
          // Open the link in an in-app browser.
          try {
            await openBrowserAsync(href, {
              presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
            });
          } catch (error) {
            console.error('Failed to open external link:', error);
          }
        }
      }}
    />
  );
}
