import { useIcons } from '../../contexts/LibrariesContext';
import { colors } from '../../theme/colors';

const ICONS = {
  User: useIcons().User,
  Users: useIcons().Users,
  Bot: useIcons().Bot,
  Search: useIcons().Search,
  LogOut: useIcons().LogOut,
  Mic: useIcons().Mic,
  MicOff: useIcons().MicOff,
  Volume2: useIcons().Volume2,
  VolumeX: useIcons().VolumeX,
  Plus: useIcons().Plus,
  Menu: useIcons().Menu
};

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  size?: number | 'xs' | 'sm' | 'md';
  color?: string;
}

export function Icon({ name, size = 'md', color }: IconProps) {
  const IconComponent = ICONS[name];
  
  const getSize = () => {
    if (typeof size === 'number') return size;
    switch (size) {
      case 'xs': return 14;
      case 'sm': return 18;
      case 'md': return 24;
      default: return 24;
    }
  };

  return <IconComponent size={getSize()} color={color || colors.text.primary} />;
}