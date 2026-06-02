import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar } from 'react-native';
import { SkiaIcon } from './SkiaIcon';
import type { EditorTheme } from '../theme/types';

interface EditorHeaderProps {
  activeTab: string;
  onCancel: () => void;
  onSave: () => void;
  onEdit: () => void;
  showDrawOption: boolean;
  enableBeforeAfter: boolean;
  showOriginal: boolean;
  onToggleOriginal: () => void;
  theme?: EditorTheme;
  enableReset?: boolean;
  onReset?: () => void;
}

export const EditorHeader = ({ 
  activeTab, 
  onCancel, 
  onSave, 
  onEdit, 
  showDrawOption,
  enableBeforeAfter,
  showOriginal,
  onToggleOriginal,
  theme,
  enableReset = true,
  onReset,
}: EditorHeaderProps) => {
  if (activeTab === "edit") return null;

  const primaryColor = theme?.primary || "#FFD60A";
  const textColor = theme?.text || "#FFF";
  const headerBg = theme?.background || "#000";

  return (
    <View style={[localStyles.headerContainer, { backgroundColor: headerBg }]}>
      <View style={localStyles.topNav}>
        <View style={localStyles.headerLeft}>
          <TouchableOpacity onPress={onCancel} style={localStyles.navBtn}>
            <Text style={[localStyles.cancelText, { color: textColor }]}>Cancel</Text>
          </TouchableOpacity>
          {enableBeforeAfter && (
            <TouchableOpacity
              onPress={onToggleOriginal}
              style={[
                localStyles.pencilBtnHeader,
                { borderColor: showOriginal ? primaryColor : textColor }
              ]}
            >
              <SkiaIcon name="EYE" color={showOriginal ? primaryColor : textColor} size={14} />
            </TouchableOpacity>
          )}
          {enableReset && onReset && (
            <TouchableOpacity
              onPress={onReset}
              style={[
                localStyles.pencilBtnHeader,
                { borderColor: textColor }
              ]}
            >
              <SkiaIcon name="RESET" color={textColor} size={14} />
            </TouchableOpacity>
          )}
        </View>

        <View style={localStyles.headerCenter}>
          <Text style={[localStyles.modeLabel, { color: textColor }]}>
            {activeTab === "adjust"
              ? "ADJUST"
              : activeTab === "filter"
                ? "FILTERS"
                : "CROP"}
          </Text>
        </View>

        <View style={localStyles.headerRight}>
          {showDrawOption && (
            <TouchableOpacity
              onPress={onEdit}
              style={[localStyles.pencilBtnHeader, { borderColor: textColor }]}
            >
              <SkiaIcon name="PENCIL" color={textColor} size={14} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onSave} style={[localStyles.doneBtn, { backgroundColor: primaryColor }]}>
            <Text style={localStyles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const localStyles = StyleSheet.create({
  headerContainer: {
    backgroundColor: "#000",
    paddingBottom: 10,
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  topNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 44,
  },
  navBtn: {
    justifyContent: "center",
  },
  cancelText: {
    color: "#FFF",
    fontSize: 17,
    fontWeight: "400",
  },
  headerCenter: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: -1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  doneBtn: {
    backgroundColor: "#FFD60A",
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  doneBtnText: {
    color: "#000",
    fontSize: 15,
    fontWeight: "700",
  },
  pencilBtnHeader: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
  },
  pencilIconText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
  modeLabel: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1.5,
  },
});

