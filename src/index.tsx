import React, { useState } from 'react';
import { StyleSheet, View, Dimensions, TouchableOpacity, Text, SafeAreaView } from 'react-native';
import { useImage, Skia, SkPath, PaintStyle } from '@shopify/react-native-skia';

import { Cropper } from './components/Cropper';
import { Filters } from './components/Filters';
import { DrawingBoard } from './components/DrawingBoard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PhotoEditorProps {
  uri: string;
  onSave: (editedUri: string) => void;
  onCancel: () => void;
}

export const PhotoEditor = ({ uri, onSave, onCancel }: PhotoEditorProps) => {
  const image = useImage(uri);
  const [activeTab, setActiveTab] = useState<'crop' | 'filter' | 'draw'>('crop');

  // Core State (Pure React)
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  
  const [brightness, setBrightness] = useState(1);
  const [contrast, setContrast] = useState(1);
  const [saturation, setSaturation] = useState(1);

  const [paths, setPaths] = useState<{ path: SkPath; color: string }[]>([]);

  if (!image) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.tabText}>Loading Image...</Text>
      </View>
    );
  }

  const handleSave = async () => {
    // 1. Create a surface for offscreen rendering
    const surface = Skia.Surface.Make(image.width(), image.height());
    if (!surface) return;
    const canvas = surface.getCanvas();

    // 2. Apply Filters
    const paint = Skia.Paint();
    const b = brightness;
    const c = contrast;
    const s = saturation;
    const t = (1 - c) / 2;
    const lumR = 0.213, lumG = 0.715, lumB = 0.072;
    
    const matrix = [
      c * ( (1-s)*lumR + s )  , c * ( (1-s)*lumG )      , c * ( (1-s)*lumB )      , 0, t*255 + (b-1)*255,
      c * ( (1-s)*lumR )      , c * ( (1-s)*lumG + s )  , c * ( (1-s)*lumB )      , 0, t*255 + (b-1)*255,
      c * ( (1-s)*lumR )      , c * ( (1-s)*lumG )      , c * ( (1-s)*lumB + s )  , 0, t*255 + (b-1)*255,
      0                       , 0                       , 0                       , 1, 0,
    ];
    paint.setColorFilter(Skia.ColorFilter.MakeMatrix(matrix));
    
    // 3. Draw Image
    canvas.drawImage(image, 0, 0, paint);
    
    // 4. Draw Paths
    const scaleRatio = image.width() / SCREEN_WIDTH;
    const pathPaint = Skia.Paint();
    pathPaint.setStyle(PaintStyle.Stroke);
    pathPaint.setStrokeWidth(4 * scaleRatio);
    
    canvas.save();
    canvas.scale(scaleRatio, scaleRatio);
    paths.forEach((p) => {
      pathPaint.setColor(Skia.Color(p.color));
      canvas.drawPath(p.path, pathPaint);
    });
    canvas.restore();

    // 5. Capture Snapshot
    const snapshot = surface.makeImageSnapshot();
    const base64 = snapshot.encodeToBase64();
    onSave(`data:image/png;base64,${base64}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.headerBtn}>
          <Text style={styles.btnText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{activeTab.toUpperCase()}</Text>
        <TouchableOpacity onPress={handleSave} style={styles.headerBtn}>
          <Text style={[styles.btnText, styles.saveBtn]}>Save</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.editorContainer}>
        {activeTab === 'crop' && (
          <Cropper 
            image={image} 
            scale={scale} 
            setScale={setScale}
            translateX={translateX} 
            setTranslateX={setTranslateX}
            translateY={translateY} 
            setTranslateY={setTranslateY}
          />
        )}
        {activeTab === 'filter' && (
          <Filters 
            image={image} 
            brightness={brightness}
            setBrightness={setBrightness}
            contrast={contrast}
            setContrast={setContrast}
            saturation={saturation}
            setSaturation={setSaturation}
          />
        )}
        {activeTab === 'draw' && (
          <DrawingBoard 
            image={image} 
            paths={paths} 
            setPaths={setPaths} 
          />
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'crop' && styles.activeTab]}
          onPress={() => setActiveTab('crop')}
        >
          <Text style={styles.tabText}>Crop</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'filter' && styles.activeTab]}
          onPress={() => setActiveTab('filter')}
        >
          <Text style={styles.tabText}>Filter</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'draw' && styles.activeTab]}
          onPress={() => setActiveTab('draw')}
        >
          <Text style={styles.tabText}>Draw</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  headerBtn: {
    padding: 10,
  },
  btnText: {
    color: '#999',
    fontSize: 16,
  },
  saveBtn: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  editorContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  footer: {
    height: 80,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#111',
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: '#333',
  },
  tabText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
});
