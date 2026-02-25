// // src/components/AudienceBar.tsx
// import React from 'react';
// import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// import { TRANSLATIONS } from '../translations';
// import { deviceLanguage } from '../screens/GameScreen';

// export const AudienceBar = ({ audience, onSelect, isHost, onFindPlayers }: any) => {
//   // The Languge Par
//   const t = TRANSLATIONS[deviceLanguage!==null? deviceLanguage : 'en'];
  
//   return (
//     <View style={styles.container}>
//       <View style={styles.headerRow}>
//         <Text style={styles.label}>{t.audience} ({audience.length})</Text>
//         {isHost && (
//           <TouchableOpacity onPress={onFindPlayers}>
//             <Text style={styles.findBtnText}>🔍 {t.findPlayers}</Text>
//           </TouchableOpacity>
//         )}
//       </View>
      
//       <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
//         {/* THE PERMANENT BOT OPTION */}
//         {isHost && (
//           <TouchableOpacity style={styles.member} onPress={() => onSelect({ type: 'BOT' })}>
//             <View style={[styles.avatarCircle, styles.botBorder]}>
//               <Text style={styles.botEmoji}>🤖</Text>
//             </View>
//             <Text style={styles.name}>+ BOT</Text>
//           </TouchableOpacity>
//         )}

//         {/* THE REAL SPECTATORS */}
//         {audience.map((person: any) => (
//           <TouchableOpacity 
//             key={person.uid} 
//             style={styles.member} 
//             onPress={() => onSelect(person)}
//           >
//             <View style={styles.avatarCircle}>
//               <Image source={{ uri: person.avatar }} style={styles.avatar} />
//             </View>
//             <Text style={styles.name} numberOfLines={1}>{person.name}</Text>
//           </TouchableOpacity>
//         ))}
//       </ScrollView>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: { height: 110, backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 10 },
//   headerRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15, marginBottom: 5 },
//   label: { color: '#888', fontSize: 10, fontWeight: 'bold' },
//   findBtnText: { color: '#2ecc71', fontSize: 10, fontWeight: 'bold' },
//   scroll: { paddingHorizontal: 10 },
//   member: { alignItems: 'center', width: 65, marginRight: 10 },
//   avatarCircle: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#2c3e50', overflow: 'hidden', borderWidth: 1, borderColor: '#444' },
//   botBorder: { borderColor: '#f1c40f', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
//   avatar: { width: '100%', height: '100%' },
//   botEmoji: { fontSize: 20 },
//   name: { color: '#ccc', fontSize: 10, marginTop: 4, fontWeight: '500' }
// });

import React from 'react';
import { Image, ScrollView, TouchableOpacity, View } from 'react-native';
import { Icon } from '../components/ui/Icon';
import { Typography } from '../components/ui/Typography';
import { useTheme } from '../contexts/ThemeContext';
import  TRANSLATIONS  from '../translations';

export const AudienceBar = ({ audience, onSelect, isHost, onFindPlayers }: any) => {
  const { colors, spacing, shadows } = useTheme();
  
  // The Language Part
  const t = TRANSLATIONS;
  
  return (
    // <View style={{ 
    //   height: 110, 
    //   backgroundColor: colors.overlay.medium, 
    //   paddingVertical: spacing.sm,
    //   borderBottomWidth: 1,
    //   borderBottomColor: colors.primary[500],
    //   ...shadows.sm,
    // }}>
    //   {/* Header Row */}
    //   <View style={{ 
    //     flexDirection: 'row', 
    //     justifyContent: 'space-between', 
    //     paddingHorizontal: spacing.lg, 
    //     marginBottom: spacing.xxs 
    //   }}>
    //     <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    //       <Icon name="Users" size="xs" color={colors.primary[500]} />
    //       <Typography 
    //         variant="caption" 
    //         color={colors.primary[500]}
    //         style={{ marginLeft: spacing.xxs, fontWeight: 'bold' }}
    //       >
    //         {t.audience} ({audience.length})
    //       </Typography>
    //     </View>
        
    //     {isHost && (
    //       <TouchableOpacity 
    //         onPress={onFindPlayers}
    //         style={{ flexDirection: 'row', alignItems: 'center' }}
    //       >
    //         <Icon name="Search" size="xs" color={colors.primary[500]} />
    //         <Typography 
    //           variant="caption" 
    //           color={colors.primary[500]}
    //           style={{ marginLeft: spacing.xxs, fontWeight: 'bold' }}
    //         >
    //           {t.findPlayers}
    //         </Typography>
    //       </TouchableOpacity>
    //     )}
    //   </View>
      
    //   {/* Audience List */}
    //   <ScrollView 
    //     horizontal 
    //     showsHorizontalScrollIndicator={false} 
    //     contentContainerStyle={{ paddingHorizontal: spacing.md }}
    //   >
    //     {/* THE PERMANENT BOT OPTION */}
    //     {isHost && (
    //       <TouchableOpacity 
    //         style={{ 
    //           alignItems: 'center', 
    //           width: 65, 
    //           marginRight: spacing.sm 
    //         }} 
    //         onPress={() => onSelect({ type: 'BOT' })}
    //       >
    //         <View style={[{
    //           width: 45,
    //           height: 45,
    //           borderRadius: 22.5,
    //           backgroundColor: colors.surface.medium,
    //           overflow: 'hidden',
    //           borderWidth: 2,
    //           borderColor: colors.accent.gold,
    //           borderStyle: 'dashed',
    //           justifyContent: 'center',
    //           alignItems: 'center',
    //           ...shadows.sm,
    //         }]}>
    //           <Icon name="Bot" size={20} color={colors.accent.gold} />
    //         </View>
    //         <Typography 
    //           variant="caption" 
    //           color={colors.accent.gold}
    //           style={{ marginTop: spacing.xxs, fontWeight: 'bold' }}
    //         >
    //           + BOT
    //         </Typography>
    //       </TouchableOpacity>
    //     )}

    //     {/* THE REAL SPECTATORS */}
    //     {audience.map((person: any) => (
    //       <TouchableOpacity 
    //         key={person.uid} 
    //         style={{ 
    //           alignItems: 'center', 
    //           width: 65, 
    //           marginRight: spacing.sm 
    //         }} 
    //         onPress={() => onSelect(person)}
    //       >
    //         <View style={{
    //           width: 45,
    //           height: 45,
    //           borderRadius: 22.5,
    //           backgroundColor: colors.surface.medium,
    //           overflow: 'hidden',
    //           borderWidth: 2,
    //           borderColor: colors.primary[500],
    //           ...shadows.sm,
    //         }}>
    //           {person.avatar ? (
    //             <Image 
    //               source={{ uri: person.avatar }} 
    //               style={{ width: '100%', height: '100%' }} 
    //             />
    //           ) : (
    //             <View style={{ 
    //               width: '100%', 
    //               height: '100%', 
    //               justifyContent: 'center', 
    //               alignItems: 'center',
    //               backgroundColor: colors.surface.medium 
    //             }}>
    //               <Icon name="User" size={20} color={colors.text.tertiary} />
    //             </View>
    //           )}
    //         </View>
    //         <Typography 
    //           variant="caption" 
    //           color={colors.text.secondary}
    //           style={{ marginTop: spacing.xxs, fontWeight: '500' }}
    //           numberOfLines={1}
    //         >
    //           {person.name}
    //         </Typography>
    //       </TouchableOpacity>
    //     ))}
    //   </ScrollView>
    // </View>
    <View style={{ 
      height: 110, 
      backgroundColor: colors.overlay.medium, 
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(46, 204, 113, 0.3)', // Subtle Emerald border
    }}>
      {/* HEADER ROW */}
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        paddingHorizontal: spacing.lg, 
        marginBottom: spacing.xs 
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Icon name="Users" size="xs" color={colors.primary[500]} />
          <Typography 
            variant="label" 
            color={colors.text.tertiary}
            style={{ marginLeft: spacing.xs, fontSize: 10 }}
          >
            {t.audience} ({audience.length})
          </Typography>
        </View>
        
       
      </View>
      
      {/* SCROLLABLE LIST */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={{ paddingHorizontal: spacing.md }}
      >
        {/* BOT RECRUITMENT BUTTON */}
        {isHost && (
          <TouchableOpacity 
            style={{ alignItems: 'center', width: 65, marginRight: spacing.sm }} 
            onPress={() => onSelect({ type: 'BOT' })}
          >
            <View style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: colors.surface.medium,
              borderWidth: 2,
              borderColor: colors.accent.gold,
              borderStyle: 'dashed',
              justifyContent: 'center',
              alignItems: 'center',
              ...shadows.sm,
            }}>
              <Icon name="Bot" size="sm" color={colors.accent.gold} />
            </View>
            <Typography 
              variant="caption" 
              color={colors.accent.gold}
              style={{ marginTop: 4, fontWeight: 'bold', fontSize: 9 }}
            >
              + BOT
            </Typography>
          </TouchableOpacity>
        )}

        {/* SPECTATOR ITEMS */}
        {audience.map((person: any) => (
          <TouchableOpacity 
            key={person.uid} 
            style={{ alignItems: 'center', width: 65, marginRight: spacing.sm }} 
            onPress={() => onSelect(person)}
          >
            <View style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: colors.surface.light,
              overflow: 'hidden',
              borderWidth: 2,
              borderColor: colors.border.medium,
              justifyContent: 'center',
              alignItems: 'center',
              ...shadows.sm,
            }}>
              {person.avatar ? (
                <Image 
                  source={{ uri: person.avatar }} 
                  style={{ width: '100%', height: '100%' }} 
                />
              ) : (
                <Icon name="User" size="sm" color={colors.text.tertiary} />
              )}
            </View>
            <Typography 
              variant="caption" 
              color={colors.text.secondary}
              style={{ marginTop: 4, fontSize: 9 }}
              numberOfLines={1}
            >
              {person.name}
            </Typography>
          </TouchableOpacity>
        ))}
         {isHost && (
          <TouchableOpacity 
            onPress={onFindPlayers}
            activeOpacity={0.7}
            style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              backgroundColor: colors.primary[700], 
              paddingHorizontal: spacing.sm, 
              paddingVertical: 4,
              borderRadius: 6,
              borderWidth: 1,
              borderColor: colors.primary[500],
              ...shadows.sm
            }}
          >
            <Icon name="Search" size="xs" color="#fff" />
            <Typography 
              variant="label"
              color="#fff"
              style={{ marginLeft: spacing.xxs, fontSize: 10, fontWeight: 'bold' }} children={undefined}            >
              {/* {t.findPlayers} */}
            </Typography>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};