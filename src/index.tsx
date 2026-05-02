import React, { useState } from 'react';
import { StyleSheet, View, Dimensions, TouchableOpacity, Text, Platform } from 'react-native';
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
  const [cropRect, setCropRect] = useState<{x: number, y: number, width: number, height: number} | null>(null);
  
  const [brightness, setBrightness] = useState(1);
  const [contrast, setContrast] = useState(1);
  const [saturation, setSaturation] = useState(1);

  const [paths, setPaths] = useState<{ path: SkPath; color: string; width: number }[]>([]);

  if (!image) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.tabText}>Loading Image...</Text>
      </View>
    );
  }

  const handleSave = async () => {
    // 1. Convert our generic 'filter' sliders into the FilterType if needed, 
    // or manually export using our Skia logic.
    // For now, since we have precise B/C/S sliders, let's just do it directly like we did before, 
    // BUT we need to apply the CropRect correctly!
    
    const surface = Skia.Surface.Make(image.width(), image.height());
    if (!surface) return;
    const canvas = surface.getCanvas();

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
    
    canvas.drawImage(image, 0, 0, paint);
    
    // Draw Paths
    const imgWidth = SCREEN_WIDTH;
    const imgHeight = SCREEN_WIDTH * (image.height() / image.width());
    const EDITOR_HEIGHT = Dimensions.get('window').height * 0.7;
    const yOffset = (EDITOR_HEIGHT - imgHeight) / 2;
    
    const scaleRatio = image.width() / imgWidth;
    const pathPaint = Skia.Paint();
    pathPaint.setStyle(PaintStyle.Stroke);
    
    canvas.save();
    canvas.scale(scaleRatio, scaleRatio);
    canvas.translate(0, -yOffset); // Remove the screen offset so paths align with the original image
    paths.forEach((p) => {
      pathPaint.setColor(Skia.Color(p.color));
      pathPaint.setStrokeWidth(p.width); // Apply specific width per path
      canvas.drawPath(p.path, pathPaint);
    });
    canvas.restore();

    let finalImage = surface.makeImageSnapshot();

    // Perform Native Crop if a crop rect was defined
    if (cropRect) {
      // The cropRect from Cropper.tsx is in screen coordinates relative to the rendered image.
      // We must scale it to the original image dimensions.
      // Wait, we will pass cropRect in original image dimensions to avoid math errors!
      const cropSurface = Skia.Surface.Make(cropRect.width, cropRect.height);
      if (cropSurface) {
        const cropCanvas = cropSurface.getCanvas();
        const srcRect = Skia.XYWHRect(cropRect.x, cropRect.y, cropRect.width, cropRect.height);
        const dstRect = Skia.XYWHRect(0, 0, cropRect.width, cropRect.height);
        cropCanvas.drawImageRect(finalImage, srcRect, dstRect, Skia.Paint());
        finalImage = cropSurface.makeImageSnapshot();
      }
    }

    const base64Data = finalImage.encodeToBase64();
    onSave(`data:image/jpeg;base64,${base64Data}`);
  };

  return (
    <View style={styles.container}>
      {/* TOP NAV BAR */}
      <View style={styles.topNav}>
        <TouchableOpacity onPress={onCancel} style={styles.pillBtn}>
          <Text style={styles.pillBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSave} style={[styles.pillBtn, styles.doneBtn]}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>

      {/* SECONDARY TOOLBAR */}
      <View style={styles.secondaryToolbar}>
        <View style={styles.leftTools}>
          <Text style={styles.iconText}>△|△</Text> 
          <Text style={styles.iconText}>⤿</Text>
        </View>
        <TouchableOpacity onPress={() => {}}>
          <Text style={styles.resetText}>RESET</Text>
        </TouchableOpacity>
        <View style={styles.rightTools}>
          <Text style={styles.iconText}>◫</Text>
          <TouchableOpacity onPress={() => setActiveTab(activeTab === 'draw' ? 'filter' : 'draw')}>
            <Text style={[styles.iconText, activeTab === 'draw' && { color: '#FFD60A' }]}>✐</Text>
          </TouchableOpacity>
          <Text style={styles.iconText}>⋯</Text>
        </View>
      </View>

      {/* EDITOR WORKSPACE */}
      <View style={styles.editorContainer}>
        {activeTab === 'crop' && (
          <Cropper 
            image={image} 
            cropRect={cropRect}
            setCropRect={setCropRect}
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

      {/* BOTTOM TAB BAR */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.tab}
          onPress={() => setActiveTab('filter')}
        >
          {activeTab === 'filter' && <Text style={styles.activeIndicator}>▼</Text>}
          <Text style={[styles.tabIcon, activeTab === 'filter' && styles.activeTabText]}>☼</Text>
          <Text style={[styles.tabText, activeTab === 'filter' && styles.activeTabText]}>Adjust</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.tab}
          onPress={() => setActiveTab('filter')}
        >
          {activeTab === 'filter' && <Text style={styles.activeIndicator}>▼</Text>}
          <Text style={[styles.tabIcon, activeTab === 'filter' && styles.activeTabText]}>꩜</Text>
          <Text style={[styles.tabText, activeTab === 'filter' && styles.activeTabText]}>Filters</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.tab}
          onPress={() => setActiveTab('crop')}
        >
          {activeTab === 'crop' && <Text style={styles.activeIndicator}>▼</Text>}
          <Text style={[styles.tabIcon, activeTab === 'crop' && styles.activeTabText]}>⛶</Text>
          <Text style={[styles.tabText, activeTab === 'crop' && styles.activeTabText]}>Crop</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: Platform.OS === 'ios' ? 47 : 0,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  pillBtn: {
    backgroundColor: '#2C2C2E',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  pillBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  doneBtn: {
    backgroundColor: '#FFD60A',
  },
  doneBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  leftTools: {
    flexDirection: 'row',
    width: 80,
    justifyContent: 'space-between',
  },
  rightTools: {
    flexDirection: 'row',
    width: 100,
    justifyContent: 'space-between',
  },
  iconText: {
    color: '#8E8E93',
    fontSize: 22,
  },
  resetText: {
    color: '#FFD60A',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  editorContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  footer: {
    height: 90,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    backgroundColor: '#000',
    paddingTop: 15,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: 80,
  },
  activeIndicator: {
    color: '#FFD60A',
    fontSize: 8,
    position: 'absolute',
    top: -12,
  },
  tabIcon: {
    color: '#8E8E93',
    fontSize: 24,
    marginBottom: 4,
  },
  tabText: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#FFF',
  },
});
