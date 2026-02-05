import { Colors } from "@/constants/theme";
import { useApp } from "@/contexts/app-context";
import {
  Add01Icon,
  Delete02Icon,
  PencilEdit02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TemplatesScreen() {
  const { templates, colorScheme, settings, deleteTemplate, formatNumber, t } =
    useApp();
  const colors = Colors[colorScheme];
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "manual" | "learned">("all");

  const { filteredTemplates, manualCount, learnedCount } = useMemo(() => {
    let manual = 0;
    let learned = 0;
    const filtered: typeof templates = [];

    templates.forEach((template) => {
      if (template.source === "manual") manual += 1;
      if (template.source === "learned") learned += 1;

      if (filter === "all" || template.source === filter) {
        filtered.push(template);
      }
    });

    return {
      filteredTemplates: filtered,
      manualCount: manual,
      learnedCount: learned,
    };
  }, [filter, templates]);

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteTemplate(id);
      setDeleteConfirm(null);
    },
    [deleteTemplate],
  );

  const getCategoryLabel = useCallback(
    (category: string) =>
      t.categories[category as keyof typeof t.categories] || category,
    [t],
  );

  const formatDate = useCallback(
    (date: Date) => {
      const d = new Date(date);
      return formatNumber(
        d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      );
    },
    [formatNumber],
  );

  const renderEmptyState = useCallback(
    () => (
      <View style={styles.emptyState}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          {filter === "all"
            ? t.templates.noTemplates
            : filter === "manual"
              ? t.templates.noManualTemplates
              : t.templates.noLearnedTemplates}
        </Text>
      </View>
    ),
    [colors.textSecondary, filter, t],
  );

  const renderTemplateItem = useCallback(
    ({ item: template }: { item: (typeof templates)[number] }) => (
      <View
        style={[
          styles.templateCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.outline,
          },
        ]}
      >
        <View style={styles.templateHeader}>
          <View style={styles.templateInfo}>
            <Text style={[styles.templateName, { color: colors.text }]}>
              {template.productNameDisplay}
            </Text>
            <View style={styles.templateMeta}>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor:
                      template.source === "learned"
                        ? colors.primary + "20"
                        : colors.outline,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    {
                      color:
                        template.source === "learned"
                          ? colors.primary
                          : colors.textSecondary,
                    },
                  ]}
                >
                  {template.source === "learned"
                    ? t.templates.aiLearned
                    : t.templates.manualTag}
                </Text>
              </View>
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  {t.templates.usedCount} {formatNumber(template.usageCount || 0)} {t.templates.usedTimes}
                </Text>
            </View>
          </View>
          <View style={styles.actions}>
            <Pressable
              onPress={() => router.push(`/templates/edit?id=${template.id}`)}
              style={styles.actionButton}
            >
              <HugeiconsIcon
                icon={PencilEdit02Icon}
                size={20}
                color={colors.primary}
              />
            </Pressable>
            <Pressable
              onPress={() => setDeleteConfirm(template.id)}
              style={styles.actionButton}
            >
              <HugeiconsIcon
                icon={Delete02Icon}
                size={20}
                color={colors.error}
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.templateDetails}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              {t.templates.category}:
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {getCategoryLabel(template.category)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              {t.templates.defaultQuantity}:
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {template.defaultQuantity
                ? formatNumber(template.defaultQuantity)
                : "—"}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              {t.templates.defaultPrice}:
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {settings.currency.symbol}
              {formatNumber(template.defaultPrice.toFixed(2))}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              {t.templates.lastUsed}
            </Text>
            <Text style={[styles.detailValue, { color: colors.textSecondary }]}>
              {formatDate(template.lastUsedAt)}
            </Text>
          </View>
        </View>
      </View>
    ),
    [
      colors,
      formatDate,
      formatNumber,
      getCategoryLabel,
      settings.currency.symbol,
      t,
    ],
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backText, { color: colors.primary }]}>
            ← {t.templates.back}
          </Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>
          {t.templates.title}
        </Text>
        <Pressable
          onPress={() => router.push("/templates/add")}
          style={[styles.addButton, { backgroundColor: colors.primary }]}
        >
          <HugeiconsIcon icon={Add01Icon} size={20} color="#fff" />
        </Pressable>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <Pressable
          onPress={() => setFilter("all")}
          style={[
            styles.filterTab,
            filter === "all" && { backgroundColor: colors.primary },
          ]}
        >
          <Text
            style={[
              styles.filterText,
              { color: filter === "all" ? "#fff" : colors.textSecondary },
            ]}
          >
            {t.templates.all} ({formatNumber(templates.length)})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setFilter("manual")}
          style={[
            styles.filterTab,
            filter === "manual" && { backgroundColor: colors.primary },
          ]}
        >
          <Text
            style={[
              styles.filterText,
              { color: filter === "manual" ? "#fff" : colors.textSecondary },
            ]}
          >
            {t.templates.manual} ({formatNumber(manualCount)})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setFilter("learned")}
          style={[
            styles.filterTab,
            filter === "learned" && { backgroundColor: colors.primary },
          ]}
        >
          <Text
            style={[
              styles.filterText,
              { color: filter === "learned" ? "#fff" : colors.textSecondary },
            ]}
          >
            {t.templates.learned} ({formatNumber(learnedCount)})
          </Text>
        </Pressable>
      </View>

      {/* Template List */}
      <FlatList
        data={filteredTemplates}
        keyExtractor={(item) => item.id}
        renderItem={renderTemplateItem}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteConfirm !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirm(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setDeleteConfirm(null)}
        >
          <View
            style={[styles.deleteModal, { backgroundColor: colors.surface }]}
            onStartShouldSetResponder={() => true}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t.alerts.deleteTemplateTitle}
            </Text>
            <Text style={[styles.modalText, { color: colors.textSecondary }]}>
              {t.alerts.deleteTemplateMessage}
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setDeleteConfirm(null)}
                style={[
                  styles.modalButton,
                  { backgroundColor: colors.outline },
                ]}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>
                  {t.form.cancel}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => deleteConfirm && handleDelete(deleteConfirm)}
                style={[styles.modalButton, { backgroundColor: colors.error }]}
              >
                <Text style={[styles.modalButtonText, { color: "#fff" }]}>
                  {t.modal.delete}
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  backText: {
    fontSize: 16,
    lineHeight: 22,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 8,
    lineHeight: 26,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  filterText: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 18,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
  },
  templateCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  templateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 6,
    lineHeight: 24,
  },
  templateMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },
  metaText: {
    fontSize: 12,
    lineHeight: 16,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  templateDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    columnGap: 8,
    rowGap: 4,
  },
  detailLabel: {
    fontSize: 14,
    lineHeight: 18,
    flexShrink: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 18,
    flexShrink: 1,
    textAlign: "right",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteModal: {
    margin: 20,
    borderRadius: 12,
    padding: 24,
    width: "80%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 12,
    lineHeight: 26,
  },
  modalText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 20,
  },
});
