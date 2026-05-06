import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SkiaIcon } from './SkiaIcon';

interface EditorHeaderProps {
  activeTab: string;
  onCancel: () => void;
  onSave: () => void;
  onEdit: () => void;
  theme?: {
    primary?: string;
    background?: string;
    text?: string;
  };
}

export const EditorHeader = ({ 
  activeTab, 
  onCancel, 
  onSave, 
  onEdit, 
  theme
}: EditorHeaderProps) => {
  if (activeTab === "edit") return null;

  const primaryColor = theme?.primary || "#FFD60A";

  return (
    <View style={localStyles.headerContainer}>
      <View style={localStyles.topNav}>
        <TouchableOpacity onPress={onCancel} style={localStyles.navBtn}>
          <Text style={localStyles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        <View style={localStyles.headerCenter}>
          <Text style={localStyles.modeLabel}>
            {activeTab === "adjust"
              ? "ADJUST"
              : activeTab === "filter"
                ? "FILTERS"
                : "CROP"}
          </Text>
        </View>

        <View style={localStyles.headerRight}>
          <TouchableOpacity
            onPress={onEdit}
            style={localStyles.pencilBtnHeader}
          >
            <SkiaIcon name="PENCIL" color="#FFF" size={14} />
          </TouchableOpacity>
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

