import 'react-native';

/**
 * `dataSet` - react-native-web xususiyati: `{ focus: 'inset' }` DOM'da
 * `data-focus="inset"` bo'lib chiqadi va global CSS (applyWebTheme.web.ts)
 * shunga qarab ishlaydi. RN tiplarida u yo'q; native esa propni shunchaki
 * e'tiborsiz qoldiradi. TextInput va Pressable proplari ViewProps'dan
 * kengaytirilgani uchun ularga ham yetib boradi.
 */
declare module 'react-native' {
  interface ViewProps {
    dataSet?: Record<string, string>;
  }
}
