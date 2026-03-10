import { Ionicons } from "@expo/vector-icons";
import * as MediaLibrary from "expo-media-library";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  Image,
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from "react-native";
import { PassportCoverArt } from "../components/PassportCoverArt";
import { citiesByCountry, countries } from "../data/geo";
import { loadPlans } from "../services/planStore";
import { loadVoyagePages, saveVoyagePage, updateVoyagePage } from "../services/voyageStore";
import { PageStamp, SavedPlan, VoyagePage } from "../types";
import { colors } from "../theme";

const MAX_PAGES = 30;
const MAX_PHOTO_CACHE = 320;
const PHOTO_TILE_SIZE = 72;
const PHOTO_TILE_GAP = 8;
type StampThemeKey = "classic" | "pastelBlue";
const STAMP_THEME_COLORS: Record<
  StampThemeKey,
  { stageBg: string; btnBg: string; btnBorder: string; btnText: string; btnDisabledBg: string; btnDisabledBorder: string; btnDisabledText: string; accent: string }
> = {
  classic: {
    stageBg: "#0D1E76",
    btnBg: "#EAF3FF",
    btnBorder: "#BFD7FF",
    btnText: "#2F5FA8",
    btnDisabledBg: "#EEF2F8",
    btnDisabledBorder: "#D8DFEA",
    btnDisabledText: "#8A98AF",
    accent: "#1E284C",
  },
  pastelBlue: {
    stageBg: "#9DC8FF",
    btnBg: "#DDF0FF",
    btnBorder: "#A9D6FF",
    btnText: "#2C6FB3",
    btnDisabledBg: "#EAF1F8",
    btnDisabledBorder: "#D4E0EC",
    btnDisabledText: "#8FA4B8",
    accent: "#2A5D99",
  },
};
type RecentPhotoItem = { id: string; uri: string };
type EditorBlock =
  | { id: string; type: "text"; value: string }
  | { id: string; type: "imageStack"; uris: string[]; offsetX: number; offsetY: number };

const MEDIA_REF_PREFIX = "mediaref:";

function isRenderableImageUri(uri: string) {
  return /^(file|content|https?|data):\/\//i.test(uri);
}

function encodeMediaRef(assetId: string, fallbackUri?: string) {
  if (!assetId) return fallbackUri ?? "";
  if (!fallbackUri) return `assetid:${assetId}`;
  return `${MEDIA_REF_PREFIX}${encodeURIComponent(assetId)}::${encodeURIComponent(fallbackUri)}`;
}

function decodeMediaRef(uri: string) {
  if (!uri.startsWith(MEDIA_REF_PREFIX)) return null;
  const payload = uri.slice(MEDIA_REF_PREFIX.length);
  const separator = payload.indexOf("::");
  if (separator < 0) {
    const assetId = decodeURIComponent(payload);
    return assetId ? { assetId, fallbackUri: null as string | null } : null;
  }
  const assetId = decodeURIComponent(payload.slice(0, separator));
  const fallbackUri = decodeURIComponent(payload.slice(separator + 2));
  return assetId ? { assetId, fallbackUri: fallbackUri || null } : null;
}

function getFallbackRenderableUri(uri: string) {
  const decoded = decodeMediaRef(uri);
  if (decoded?.fallbackUri && isRenderableImageUri(decoded.fallbackUri)) {
    return decoded.fallbackUri;
  }
  return isRenderableImageUri(uri) ? uri : null;
}

function normalizePhotoRef(uri: string) {
  if (!uri) return uri;
  if (uri.startsWith(MEDIA_REF_PREFIX)) return uri;
  const assetId = toAssetCandidates(uri)[0];
  if (!assetId) return uri;
  return encodeMediaRef(assetId, getFallbackRenderableUri(uri) ?? undefined);
}

function toAssetCandidates(uri: string) {
  const candidates: string[] = [];
  const decoded = decodeMediaRef(uri);
  if (decoded?.assetId) {
    candidates.push(decoded.assetId);
  }
  if (uri.startsWith("assetid:")) {
    candidates.push(uri.slice("assetid:".length));
  }
  if (uri.startsWith("ph://")) {
    const raw = decodeURIComponent(uri.slice("ph://".length));
    if (raw) {
      candidates.push(raw);
      const head = raw.split("/")[0];
      if (head && head !== raw) candidates.push(head);
    }
  }
  return Array.from(new Set(candidates));
}

function makeBlockId() {
  return `${Date.now()}-${Math.round(Math.random() * 100000)}`;
}

function readPhotoUrisFromBlocks(blocks: EditorBlock[]) {
  return blocks.flatMap((block) => (block.type === "imageStack" ? block.uris : []));
}

function readNoteFromBlocks(blocks: EditorBlock[]) {
  return blocks
    .filter((block): block is Extract<EditorBlock, { type: "text" }> => block.type === "text")
    .map((block) => block.value)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const STAMP_PRESETS = [
  { key: "air", icon: "airplane", tint: "#D84D4D" },
  { key: "map", icon: "map", tint: "#2E7D5B" },
  { key: "star", icon: "star", tint: "#C4832C" },
  { key: "heart", icon: "heart", tint: "#B54A8D" },
  { key: "sunny", icon: "sunny", tint: "#D88A21" },
] as const;

export function VoyageScreen() {
  const DRAG_HOLD_MS = 420;
  const { width } = useWindowDimensions();
  const stageWidth = Math.min(width - 32, 420);
  const stageHeight = Math.round(stageWidth * 1.72);

  const [opened, setOpened] = useState(false);
  const [pages, setPages] = useState<VoyagePage[]>([]);
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [activePageIndex, setActivePageIndex] = useState(0);

  const [allModalVisible, setAllModalVisible] = useState(false);
  const [editorVisible, setEditorVisible] = useState(false);
  const [planPickerVisible, setPlanPickerVisible] = useState(false);

  const [sliderWidth, setSliderWidth] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [countryQuery, setCountryQuery] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [contentBlocks, setContentBlocks] = useState<EditorBlock[]>([{ id: makeBlockId(), type: "text", value: "" }]);
  const [activeTextBlockId, setActiveTextBlockId] = useState<string | null>(null);
  const [activeSelection, setActiveSelection] = useState({ start: 0, end: 0 });
  const [stamps, setStamps] = useState<PageStamp[]>([]);
  const [selectedStampId, setSelectedStampId] = useState<string | null>(null);
  const [stampPickerVisible, setStampPickerVisible] = useState(false);
  const [photoPickerVisible, setPhotoPickerVisible] = useState(false);
  const [recentPhotos, setRecentPhotos] = useState<RecentPhotoItem[]>([]);
  const [photoCursor, setPhotoCursor] = useState<string | undefined>(undefined);
  const [hasMorePhotos, setHasMorePhotos] = useState(true);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [draftPhotoIds, setDraftPhotoIds] = useState<string[]>([]);
  const [photoGalleryVisible, setPhotoGalleryVisible] = useState(false);
  const [galleryPhotoUris, setGalleryPhotoUris] = useState<string[]>([]);
  const [zoomPhotoVisible, setZoomPhotoVisible] = useState(false);
  const [zoomPhotoUri, setZoomPhotoUri] = useState<string | null>(null);
  const [stampTheme, setStampTheme] = useState<StampThemeKey>("classic");
  const [themePickerVisible, setThemePickerVisible] = useState(false);
  const [draggingStackId, setDraggingStackId] = useState<string | null>(null);
  const [pressingStackId, setPressingStackId] = useState<string | null>(null);
  const [stackDeleteTargetId, setStackDeleteTargetId] = useState<string | null>(null);
  const [dropPreview, setDropPreview] = useState<{ id: string; x: number; y: number } | null>(null);
  const [resolvedImageMap, setResolvedImageMap] = useState<Record<string, string>>({});
  const [photoPickerAnchor, setPhotoPickerAnchor] = useState({ x: width - 20, y: stageHeight });
  const [stampPickerAnchor, setStampPickerAnchor] = useState({ x: width - 20, y: stageHeight });
  const [editorCanvasSize, setEditorCanvasSize] = useState({ width: 1, height: 1 });
  const [mediaPermissionGranted, setMediaPermissionGranted] = useState(false);

  const openProgress = useRef(new Animated.Value(0)).current;
  const stampPickerScale = useRef(new Animated.Value(0.2)).current;
  const stampPickerOpacity = useRef(new Animated.Value(0)).current;
  const photoPickerScale = useRef(new Animated.Value(0.2)).current;
  const photoPickerOpacity = useRef(new Animated.Value(0)).current;
  const pageScrollX = useRef(new Animated.Value(0)).current;
  const sliderRef = useRef<any>(null);
  const textInputRefs = useRef<Record<string, TextInput | null>>({});
  const textSelectionsRef = useRef<Record<string, { start: number; end: number }>>({});
  const insertionTargetRef = useRef<{ id: string | null; selection: { start: number; end: number } }>({
    id: null,
    selection: { start: 0, end: 0 },
  });
  const stackDragRef = useRef<{ id: string | null; startX: number; startY: number; baseX: number; baseY: number; armed: boolean; holdReady: boolean; moved: boolean }>({
    id: null,
    startX: 0,
    startY: 0,
    baseX: 0,
    baseY: 0,
    armed: false,
    holdReady: false,
    moved: false,
  });
  const stackDragTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reopenGalleryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragLiftAnim = useRef(new Animated.Value(0)).current;
  const dragOffsetXAnim = useRef(new Animated.Value(0)).current;
  const dragOffsetYAnim = useRef(new Animated.Value(0)).current;
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const photoBtnRef = useRef<View | null>(null);
  const stampBtnRef = useRef<View | null>(null);
  const photoLoadSessionRef = useRef(0);
  const photoPickerOpeningRef = useRef(false);
  const photoLoadingRef = useRef(false);
  const photoOpenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stampPickerClosingRef = useRef(false);
  const photoPickerClosingRef = useRef(false);
  const INPUT_ACCESSORY_ID = "voyageEditorDoneAccessory";
  const selectedPhotoIdSet = useMemo(() => new Set(draftPhotoIds), [draftPhotoIds]);
  const themeColors = STAMP_THEME_COLORS[stampTheme];

  const ensureMediaPermission = useCallback(async () => {
    const current = await MediaLibrary.getPermissionsAsync();
    if (current.granted) {
      if (!mediaPermissionGranted) setMediaPermissionGranted(true);
      return true;
    }
    const requested = await MediaLibrary.requestPermissionsAsync();
    if (requested.granted) {
      if (!mediaPermissionGranted) setMediaPermissionGranted(true);
      return true;
    }
    return false;
  }, [mediaPermissionGranted]);

  useEffect(() => {
    async function init() {
      const [loadedPages, loadedPlans] = await Promise.all([loadVoyagePages(), loadPlans()]);
      setPages(loadedPages);
      setPlans(loadedPlans);
      if (loadedPages.length > 0) {
        setActivePageIndex(0);
      }
    }
    void init();
  }, []);

  useEffect(() => {
    void (async () => {
      const permission = await MediaLibrary.getPermissionsAsync();
      if (permission.granted) {
        setMediaPermissionGranted(true);
      }
    })();
  }, []);

  const orderedPages = useMemo(() => [...pages].reverse(), [pages]);

  useEffect(() => {
    if (sliderWidth <= 0 || orderedPages.length === 0) return;
    const safeIndex = Math.max(0, Math.min(activePageIndex, orderedPages.length - 1));
    sliderRef.current?.scrollTo({ x: safeIndex * sliderWidth, animated: true });
  }, [activePageIndex, orderedPages.length, sliderWidth]);

  useEffect(() => {
    return () => {
      if (stackDragTimerRef.current) {
        clearTimeout(stackDragTimerRef.current);
      }
      if (reopenGalleryTimerRef.current) {
        clearTimeout(reopenGalleryTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!dropPreview) return;
    const found = contentBlocks.find((item) => item.id === dropPreview.id && item.type === "imageStack");
    if (!found || found.type !== "imageStack") {
      setDropPreview(null);
      return;
    }
    if (Math.abs(found.offsetX - dropPreview.x) < 0.5 && Math.abs(found.offsetY - dropPreview.y) < 0.5) {
      setDropPreview(null);
    }
  }, [contentBlocks, dropPreview]);

  const resolveDisplayUri = useCallback(
    (uri: string) => {
      const mapped = resolvedImageMap[uri];
      if (mapped && isRenderableImageUri(mapped)) return mapped;
      return getFallbackRenderableUri(uri);
    },
    [resolvedImageMap],
  );

  useEffect(() => {
    const refs = new Set<string>();
    recentPhotos.forEach((item) => refs.add(item.uri));
    contentBlocks.forEach((block) => {
      if (block.type === "imageStack") block.uris.forEach((uri) => refs.add(uri));
    });
    orderedPages.forEach((page) => {
      (page.photoUris ?? []).forEach((uri) => refs.add(uri));
      if (page.photoUri) refs.add(page.photoUri);
    });
    galleryPhotoUris.forEach((uri) => refs.add(uri));
    if (zoomPhotoUri) refs.add(zoomPhotoUri);

    if (!mediaPermissionGranted) return;

    const unresolved = Array.from(refs).filter((uri) => {
      if (resolvedImageMap[uri]) return false;
      return toAssetCandidates(uri).length > 0;
    });
    if (unresolved.length === 0) return;
    let cancelled = false;

    void (async () => {
      for (const ref of unresolved.slice(0, 30)) {
        if (cancelled) return;
        const candidates = toAssetCandidates(ref);
        for (const id of candidates) {
          try {
            const info = await MediaLibrary.getAssetInfoAsync(id, { shouldDownloadFromNetwork: true });
            const candidateUri = info?.localUri ?? info?.uri ?? "";
            if (candidateUri && isRenderableImageUri(candidateUri)) {
              if (cancelled) return;
              setResolvedImageMap((prev) => (prev[ref] ? prev : { ...prev, [ref]: candidateUri }));
              break;
            }
          } catch {
            // keep silent; unresolved refs fall back to placeholder
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [contentBlocks, galleryPhotoUris, mediaPermissionGranted, orderedPages, recentPhotos, resolvedImageMap, zoomPhotoUri]);

  const currentPage = orderedPages.length > 0 ? orderedPages[Math.max(0, Math.min(activePageIndex, orderedPages.length - 1))] : null;
  const galleryResolvedPhotoUris = useMemo(
    () => galleryPhotoUris.map((uri) => resolveDisplayUri(uri)).filter((uri): uri is string => !!uri),
    [galleryPhotoUris, resolveDisplayUri],
  );

  const displaySlideTitle = (page: VoyagePage) => {
    if (!page.title || /^Untitled Page\s+\d+$/i.test(page.title.trim())) {
      return `${page.country} | ${page.city}`;
    }
    return page.title;
  };

  const countrySuggestions = useMemo(() => {
    const isMatch = (value: string, query: string) => {
      const v = value.toLowerCase();
      const q = query.toLowerCase();
      if (v.startsWith(q)) return true;
      return v.split(/[\s-]+/).some((part) => part.startsWith(q));
    };
    const keyword = countryQuery.trim().toLowerCase();
    if (!keyword) return countries.slice(0, 8);
    return countries.filter((item) => isMatch(item, keyword)).slice(0, 8);
  }, [countryQuery]);

  const citySuggestions = useMemo(() => {
    const isMatch = (value: string, query: string) => {
      const v = value.toLowerCase();
      const q = query.toLowerCase();
      if (v.startsWith(q)) return true;
      return v.split(/[\s-]+/).some((part) => part.startsWith(q));
    };
    if (!selectedCountry) return [];
    const base = citiesByCountry[selectedCountry] ?? [];
    const keyword = cityQuery.trim().toLowerCase();
    if (!keyword) return base.slice(0, 8);
    return base.filter((item) => isMatch(item, keyword)).slice(0, 8);
  }, [cityQuery, selectedCountry]);

  const coverRotate = openProgress.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-106deg"] });
  const coverTranslateX = openProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -(stageWidth * 0.35)] });
  const coverTranslateY = openProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -16] });
  const coverOpacity = openProgress.interpolate({ inputRange: [0, 0.65, 1], outputRange: [1, 0.9, 0] });
  const coverScale = openProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.95] });
  const insideOpacity = openProgress.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.35, 1] });

  const openPassport = () => {
    setOpened(true);
    Animated.sequence([
      Animated.timing(openProgress, {
        toValue: 0.1,
        duration: 100,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(openProgress, {
        toValue: 1,
        stiffness: 200,
        damping: 20,
        mass: 0.9,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closePhotoViewer = useCallback(() => {
    if (reopenGalleryTimerRef.current) {
      clearTimeout(reopenGalleryTimerRef.current);
      reopenGalleryTimerRef.current = null;
    }
    setZoomPhotoVisible(false);
    setZoomPhotoUri(null);
    setPhotoGalleryVisible(false);
    setGalleryPhotoUris([]);
  }, []);

  const closePassport = () => {
    setOpened(false);
    setEditorVisible(false);
    setPlanPickerVisible(false);
    setStampPickerVisible(false);
    setPhotoPickerVisible(false);
    closePhotoViewer();
    Animated.timing(openProgress, {
      toValue: 0,
      duration: 300,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const togglePassport = () => {
    if (opened) {
      closePassport();
    } else {
      openPassport();
    }
  };

  const resetEditor = () => {
    const firstTextId = makeBlockId();
    setEditingPageId(null);
    setTitle("");
    setCountryQuery("");
    setCityQuery("");
    setSelectedCountry("");
    setSelectedCity("");
    setContentBlocks([{ id: firstTextId, type: "text", value: "" }]);
    setActiveTextBlockId(firstTextId);
    setActiveSelection({ start: 0, end: 0 });
    setStamps([]);
    setSelectedStampId(null);
    setStampPickerVisible(false);
    setPhotoPickerVisible(false);
    setDraftPhotoIds([]);
    closePhotoViewer();
    setGalleryPhotoUris([]);
    setError(null);
    setPlanPickerVisible(false);
    setDraggingStackId(null);
    setPressingStackId(null);
    setStackDeleteTargetId(null);
    setDropPreview(null);
  };

  const closeStampPicker = () => {
    if (!stampPickerVisible || stampPickerClosingRef.current) return;
    stampPickerClosingRef.current = true;
    Animated.parallel([
      Animated.timing(stampPickerScale, {
        toValue: 0.2,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(stampPickerOpacity, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setStampPickerVisible(false);
      stampPickerClosingRef.current = false;
    });
  };

  const measureAnchor = (targetRef: { current: View | null }, fallback: { x: number; y: number }) =>
    new Promise<{ x: number; y: number }>((resolve) => {
      const node = targetRef.current as any;
      if (!node || typeof node.measureInWindow !== "function") {
        resolve(fallback);
        return;
      }
      node.measureInWindow((x: number, y: number, w: number, h: number) => {
        if (Number.isFinite(x) && Number.isFinite(y)) {
          resolve({ x: x + w, y: y + h });
        } else {
          resolve(fallback);
        }
      });
    });

  const loadPhotoPage = async (reset = false, fallbackQuery = false, sessionId?: number): Promise<number> => {
    const activeSession = sessionId ?? photoLoadSessionRef.current;
    if (activeSession !== photoLoadSessionRef.current) return 0;
    if (photoLoadingRef.current) return 0;
    if (!reset && !hasMorePhotos) return 0;

    photoLoadingRef.current = true;
    setLoadingPhotos(true);
    try {
      const result = fallbackQuery
        ? await MediaLibrary.getAssetsAsync({
            first: 80,
            after: reset ? undefined : photoCursor,
          })
        : await MediaLibrary.getAssetsAsync({
            first: 80,
            after: reset ? undefined : photoCursor,
            mediaType: [MediaLibrary.MediaType.photo],
            sortBy: [MediaLibrary.SortBy.creationTime],
          });
      const mapped = result.assets
        .map((asset) => ({
          id: asset.id,
          uri: encodeMediaRef(asset.id, isRenderableImageUri(asset.uri) ? asset.uri : undefined),
        }))
        .filter((item) => !!item.uri);
      if (activeSession !== photoLoadSessionRef.current) return 0;

      setRecentPhotos((prev) => {
        if (reset) return mapped.slice(0, MAX_PHOTO_CACHE);
        const existingIds = new Set(prev.map((item) => item.id));
        const deduped = mapped.filter((item) => !existingIds.has(item.id));
        const merged = [...prev, ...deduped];
        return merged.length > MAX_PHOTO_CACHE ? merged.slice(merged.length - MAX_PHOTO_CACHE) : merged;
      });
      setPhotoCursor(result.endCursor ?? undefined);
      setHasMorePhotos(result.hasNextPage);
      if (activeSession !== photoLoadSessionRef.current) {
        return 0;
      }

      // iOS에서 ph:// uri는 썸네일 렌더가 불안정할 수 있어 localUri를 배치 보강한다.
      void (async () => {
        const currentSession = activeSession;
        const targetAssets = result.assets.slice(0, 48);
        const batchSize = 12;
        for (let i = 0; i < targetAssets.length; i += batchSize) {
          if (currentSession !== photoLoadSessionRef.current) return;
          const chunk = targetAssets.slice(i, i + batchSize);
          const infoList = await Promise.all(
            chunk.map((asset) => MediaLibrary.getAssetInfoAsync(asset.id, { shouldDownloadFromNetwork: true }).catch(() => null)),
          );
          if (currentSession !== photoLoadSessionRef.current) return;
          const patch = chunk
            .map((asset, idx) => ({
              id: asset.id,
              uri: encodeMediaRef(asset.id, infoList[idx]?.localUri ?? (isRenderableImageUri(asset.uri) ? asset.uri : undefined)),
            }))
            .filter((item) => !!item.uri);
          if (patch.length === 0) continue;
          setRecentPhotos((prev) => {
            const map = new Map(prev.map((item) => [item.id, item] as const));
            patch.forEach((item) => map.set(item.id, item));
            const next = Array.from(map.values());
            return next.length > MAX_PHOTO_CACHE ? next.slice(next.length - MAX_PHOTO_CACHE) : next;
          });
        }
      })();

      return mapped.length;
    } catch {
      setError("사진을 불러오는 중 오류가 발생했습니다.");
      return 0;
    } finally {
      photoLoadingRef.current = false;
      setLoadingPhotos(false);
    }
  };

  const openPhotoPicker = async () => {
    if (photoPickerOpeningRef.current) return;
    photoPickerOpeningRef.current = true;

    const sessionId = photoLoadSessionRef.current + 1;
    photoLoadSessionRef.current = sessionId;

    insertionTargetRef.current = {
      id: activeTextBlockId,
      selection:
        (activeTextBlockId && textSelectionsRef.current[activeTextBlockId]) ||
        textSelectionsRef.current[activeTextBlockId || ""] || { ...activeSelection },
    };

    setDraftPhotoIds([]);
    setError(null);
    setStampPickerVisible(false);
    setPhotoPickerAnchor({ x: width - 16, y: stageHeight - 16 });
    setPhotoPickerVisible(true);
    photoPickerScale.setValue(0.2);
    photoPickerOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(photoPickerScale, {
        toValue: 1,
        stiffness: 170,
        damping: 10,
        mass: 0.6,
        overshootClamping: false,
        useNativeDriver: true,
      }),
      Animated.timing(photoPickerOpacity, {
        toValue: 1,
        duration: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    try {
      const anchor = await measureAnchor(photoBtnRef, { x: width - 16, y: stageHeight - 16 });
      if (sessionId === photoLoadSessionRef.current) {
        setPhotoPickerAnchor(anchor);
      }

      const available = await MediaLibrary.isAvailableAsync();
      if (!available) {
        if (sessionId === photoLoadSessionRef.current) {
          setError("사진 라이브러리를 사용할 수 없습니다.");
          closePhotoPicker();
        }
        return;
      }

      const granted = await ensureMediaPermission();
      if (!granted) {
        if (sessionId === photoLoadSessionRef.current) {
          setError("사진 접근 권한이 필요합니다.");
          closePhotoPicker();
        }
        return;
      }

      if (sessionId !== photoLoadSessionRef.current) return;

      if (photoOpenTimerRef.current) {
        clearTimeout(photoOpenTimerRef.current);
      }
      photoOpenTimerRef.current = setTimeout(async () => {
        if (sessionId !== photoLoadSessionRef.current) return;
        if (recentPhotos.length === 0) {
          setPhotoCursor(undefined);
          setHasMorePhotos(true);
          const loadedCount = await loadPhotoPage(true, false, sessionId);
          if (loadedCount === 0) {
            await loadPhotoPage(true, true, sessionId);
          }
        }
      }, 40);
    } catch (err) {
      if (sessionId === photoLoadSessionRef.current) {
        const message = err instanceof Error ? err.message : "";
        setError(message ? `사진 로딩 오류: ${message}` : "사진을 불러오는 중 오류가 발생했습니다.");
      }
    } finally {
      photoPickerOpeningRef.current = false;
    }
  };

  const closePhotoPicker = () => {
    if (!photoPickerVisible || photoPickerClosingRef.current) return;
    photoPickerClosingRef.current = true;
    photoLoadSessionRef.current += 1;
    photoPickerOpeningRef.current = false;
    if (photoOpenTimerRef.current) {
      clearTimeout(photoOpenTimerRef.current);
      photoOpenTimerRef.current = null;
    }
    Animated.parallel([
      Animated.timing(photoPickerScale, {
        toValue: 0.2,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(photoPickerOpacity, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      photoLoadingRef.current = false;
      setLoadingPhotos(false);
      setPhotoPickerVisible(false);
      photoPickerClosingRef.current = false;
    });
  };

  const addPresetStamp = (presetKey: string) => {
    const nextStamp: PageStamp = {
      id: `${Date.now()}-${Math.round(Math.random() * 10000)}`,
      presetKey,
      x: 0.5,
      y: 0.5,
      scale: 1,
      rotation: 0,
    };
    setStamps((prev) => [...prev, nextStamp]);
    setSelectedStampId(nextStamp.id);
    closeStampPicker();
  };

  const openStampPicker = async () => {
    setPhotoPickerVisible(false);
    const anchor = await measureAnchor(stampBtnRef, { x: width - 16, y: stageHeight - 16 });
    setStampPickerAnchor(anchor);
    setStampPickerVisible(true);
    stampPickerScale.setValue(0.2);
    stampPickerOpacity.setValue(0);

    Animated.parallel([
      Animated.spring(stampPickerScale, {
        toValue: 1,
        stiffness: 170,
        damping: 10,
        mass: 0.6,
        overshootClamping: false,
        useNativeDriver: true,
      }),
      Animated.timing(stampPickerOpacity, {
        toValue: 1,
        duration: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const openInlineEditor = () => {
    // Add Stamp: start a new page by default
    resetEditor();
    setEditorVisible(true);
  };

  const applyPlanToEditor = (plan: SavedPlan) => {
    setTitle((prev) => prev || `${plan.city} Journey`);
    setSelectedCountry(plan.country);
    setCountryQuery(plan.country);
    setSelectedCity(plan.city);
    setCityQuery(plan.city);
    const planText = `${plan.startDate} - ${plan.endDate}`;
    setContentBlocks((prev) => {
      const targetId = activeTextBlockId ?? prev.find((block) => block.type === "text")?.id;
      return prev.map((block) =>
        block.type === "text" && block.id === targetId ? { ...block, value: block.value ? `${block.value}\n${planText}` : planText } : block,
      );
    });
    setPlanPickerVisible(false);
  };

  const toggleRecentPhoto = useCallback((id: string) => {
    setDraftPhotoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return Array.from(next);
    });
  }, []);

  const removeDraftPhoto = useCallback((id: string) => {
    setDraftPhotoIds((prev) => prev.filter((item) => item !== id));
  }, []);

  const removeImageStack = useCallback((blockId: string) => {
    setContentBlocks((prev) => prev.filter((item) => item.id !== blockId));
    setStackDeleteTargetId((prev) => (prev === blockId ? null : prev));
    setDraggingStackId((prev) => (prev === blockId ? null : prev));
    setPressingStackId((prev) => (prev === blockId ? null : prev));
    setDropPreview((prev) => (prev?.id === blockId ? null : prev));
  }, []);

  const renderPhotoItem = useCallback(
    ({ item }: { item: RecentPhotoItem }) => {
      const displayUri = resolveDisplayUri(item.uri);
      const selected = selectedPhotoIdSet.has(item.id);
      return (
        <Pressable style={styles.photoPickerItem} onPress={() => toggleRecentPhoto(item.id)}>
          {displayUri ? (
            <Image source={{ uri: displayUri }} style={styles.photoThumb} />
          ) : (
            <View style={styles.photoThumbPlaceholder}>
              <Ionicons name="image-outline" size={20} color="#7B8794" />
            </View>
          )}
          {selected ? (
            <View style={styles.photoSelectedMask}>
              <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
            </View>
          ) : null}
          {selected ? (
            <Pressable
              style={styles.photoRemoveChip}
              hitSlop={8}
              onPress={(event) => {
                event.stopPropagation();
                removeDraftPhoto(item.id);
              }}
            >
              <Ionicons name="close" size={12} color="#0F172A" />
            </Pressable>
          ) : null}
        </Pressable>
      );
    },
    [removeDraftPhoto, resolveDisplayUri, selectedPhotoIdSet, toggleRecentPhoto],
  );

  const startStackDrag = (blockId: string, pageX: number, pageY: number, baseX: number, baseY: number) => {
    if (stackDragTimerRef.current) {
      clearTimeout(stackDragTimerRef.current);
      stackDragTimerRef.current = null;
    }
    setStackDeleteTargetId(null);
    stackDragRef.current = { id: blockId, startX: pageX, startY: pageY, baseX, baseY, armed: false, holdReady: false, moved: false };
    setPressingStackId(blockId);
    stackDragTimerRef.current = setTimeout(() => {
      if (stackDragRef.current.id !== blockId) return;
      stackDragRef.current.holdReady = true;
      setStackDeleteTargetId(blockId);
    }, DRAG_HOLD_MS);
  };

  const armStackDrag = (blockId: string) => {
    if (stackDragRef.current.id !== blockId) return;
    stackDragRef.current.armed = true;
    setStackDeleteTargetId(null);
    setDraggingStackId(blockId);
    dragOffsetXAnim.setValue(stackDragRef.current.baseX);
    dragOffsetYAnim.setValue(stackDragRef.current.baseY);
    dragOffsetRef.current = { x: stackDragRef.current.baseX, y: stackDragRef.current.baseY };
    Animated.spring(dragLiftAnim, {
      toValue: 1,
      stiffness: 180,
      damping: 14,
      mass: 0.65,
      useNativeDriver: true,
    }).start();
  };

  const moveStackDrag = (pageX: number, pageY: number) => {
    const state = stackDragRef.current;
    if (!state.id) return;
    const dx = pageX - state.startX;
    const dy = pageY - state.startY;
    if (Math.abs(dx) > 14 || Math.abs(dy) > 14) {
      state.moved = true;
      if (stackDeleteTargetId === state.id) {
        setStackDeleteTargetId(null);
      }
    }
    if (!state.armed && state.holdReady && state.moved) {
      armStackDrag(state.id);
    }
    if (!state.armed) return;
    const minX = -editorCanvasSize.width;
    const maxX = editorCanvasSize.width;
    const minY = -editorCanvasSize.height;
    const maxY = editorCanvasSize.height;
    const nextX = Math.max(minX, Math.min(maxX, state.baseX + dx));
    const nextY = Math.max(minY, Math.min(maxY, state.baseY + dy));
    dragOffsetXAnim.setValue(nextX);
    dragOffsetYAnim.setValue(nextY);
    dragOffsetRef.current = { x: nextX, y: nextY };
  };

  const openStackGallery = (uris: string[]) => {
    const nextUris = uris.map((uri) => resolveDisplayUri(uri)).filter((uri): uri is string => !!uri);
    if (nextUris.length === 0) return;
    setStackDeleteTargetId(null);
    setPressingStackId(null);
    setDraggingStackId(null);
    setZoomPhotoVisible(false);
    setZoomPhotoUri(null);
    setGalleryPhotoUris(nextUris);
    if (photoGalleryVisible) {
      setPhotoGalleryVisible(false);
      if (reopenGalleryTimerRef.current) {
        clearTimeout(reopenGalleryTimerRef.current);
      }
      reopenGalleryTimerRef.current = setTimeout(() => {
        setPhotoGalleryVisible(true);
        reopenGalleryTimerRef.current = null;
      }, 170);
      return;
    }
    setPhotoGalleryVisible(true);
  };

  const endStackDrag = (options?: { preserveDeletePrompt?: boolean }) => {
    const state = stackDragRef.current;
    const draggedId = state.id;
    const wasArmed = state.armed;
    if (draggedId && wasArmed) {
      const committedX = dragOffsetRef.current.x;
      const committedY = dragOffsetRef.current.y;
      setDropPreview({ id: draggedId, x: committedX, y: committedY });
      setContentBlocks((prev) =>
        prev.map((item) =>
          item.id === draggedId && item.type === "imageStack"
            ? {
                ...item,
                offsetX: committedX,
                offsetY: committedY,
              }
            : item,
        ),
      );
    }
    if (stackDragTimerRef.current) {
      clearTimeout(stackDragTimerRef.current);
      stackDragTimerRef.current = null;
    }
    stackDragRef.current = { id: null, startX: 0, startY: 0, baseX: 0, baseY: 0, armed: false, holdReady: false, moved: false };
    const releaseVisual = () => {
      setDraggingStackId(null);
      setPressingStackId(null);
      if (!options?.preserveDeletePrompt) {
        setStackDeleteTargetId(null);
      }
      Animated.timing(dragLiftAnim, {
        toValue: 0,
        duration: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
      dragOffsetRef.current = { x: 0, y: 0 };
    };
    if (wasArmed) {
      requestAnimationFrame(() => {
        releaseVisual();
      });
      return;
    }
    releaseVisual();
  };

  const buildStackPanHandlers = (block: Extract<EditorBlock, { type: "imageStack" }>) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => stackDeleteTargetId !== block.id,
      onMoveShouldSetPanResponder: () => stackDeleteTargetId !== block.id,
      onPanResponderGrant: (event) => {
        startStackDrag(block.id, event.nativeEvent.pageX, event.nativeEvent.pageY, block.offsetX, block.offsetY);
      },
      onPanResponderMove: (event) => {
        moveStackDrag(event.nativeEvent.pageX, event.nativeEvent.pageY);
      },
      onPanResponderRelease: (event) => {
        const state = stackDragRef.current;
        if (state.id === block.id && state.armed) {
          moveStackDrag(event.nativeEvent.pageX, event.nativeEvent.pageY);
        }
        const shouldKeepDeletePrompt = state.id === block.id && state.holdReady && !state.armed && !state.moved;
        const shouldOpenGallery = state.id === block.id && !state.holdReady && !state.armed && !state.moved;
        endStackDrag({ preserveDeletePrompt: shouldKeepDeletePrompt });
        if (shouldOpenGallery) {
          openStackGallery(block.uris);
        }
      },
      onPanResponderTerminate: () => {
        endStackDrag();
      },
      onPanResponderTerminationRequest: () => false,
    }).panHandlers;

  const applySelectedPhotos = async () => {
    if (draftPhotoIds.length === 0) {
      closePhotoPicker();
      return;
    }

    const chosenAssets = recentPhotos.filter((item) => draftPhotoIds.includes(item.id));
    const infoList = await Promise.all(
      chosenAssets.map((item) => MediaLibrary.getAssetInfoAsync(item.id, { shouldDownloadFromNetwork: true }).catch(() => null)),
    );
    const selectedUris = chosenAssets
      .map((item, idx) =>
        encodeMediaRef(item.id, infoList[idx]?.localUri ?? getFallbackRenderableUri(item.uri) ?? undefined),
      )
      .filter((uri): uri is string => !!uri);
    if (selectedUris.length === 0) {
      closePhotoPicker();
      return;
    }

    const fallbackTextId = makeBlockId();
    setContentBlocks((prev) => {
      const targetId = insertionTargetRef.current.id ?? activeTextBlockId ?? prev.find((block) => block.type === "text")?.id ?? fallbackTextId;
      const index = prev.findIndex((block) => block.id === targetId && block.type === "text");
      if (index < 0) {
        const appended: EditorBlock[] = [
          ...prev,
          { id: makeBlockId(), type: "imageStack", uris: [...selectedUris], offsetX: 0, offsetY: 0 },
          { id: fallbackTextId, type: "text", value: "" },
        ];
        setTimeout(() => {
          textInputRefs.current[fallbackTextId]?.focus();
          setActiveTextBlockId(fallbackTextId);
          setActiveSelection({ start: 0, end: 0 });
        }, 40);
        return appended;
      }

      const target = prev[index] as Extract<EditorBlock, { type: "text" }>;
      const selectedRange =
        (insertionTargetRef.current.id === target.id ? insertionTargetRef.current.selection : null) ??
        textSelectionsRef.current[target.id] ??
        activeSelection;
      const start = Math.max(0, Math.min(selectedRange.start, target.value.length));
      const end = Math.max(start, Math.min(selectedRange.end, target.value.length));
      const before = target.value.slice(0, start);
      const after = target.value.slice(end);
      const suffixId = makeBlockId();

      const next: EditorBlock[] = [
        ...prev.slice(0, index),
        { id: target.id, type: "text", value: before },
        { id: makeBlockId(), type: "imageStack", uris: [...selectedUris], offsetX: 0, offsetY: 0 },
        { id: suffixId, type: "text", value: after },
        ...prev.slice(index + 1),
      ];

      setTimeout(() => {
        textInputRefs.current[suffixId]?.focus();
        setActiveTextBlockId(suffixId);
        setActiveSelection({ start: 0, end: 0 });
      }, 40);

      return next;
    });
    setDraftPhotoIds([]);
    closePhotoPicker();
  };

  const adjustSelectedStamp = (patch: Partial<Pick<PageStamp, "scale" | "rotation">>) => {
    if (!selectedStampId) return;
    setStamps((prev) =>
      prev.map((stamp) =>
        stamp.id === selectedStampId
          ? {
              ...stamp,
              scale: patch.scale !== undefined ? Math.max(0.4, Math.min(2.5, patch.scale)) : stamp.scale,
              rotation: patch.rotation !== undefined ? patch.rotation : stamp.rotation,
            }
          : stamp,
      ),
    );
  };

  const saveInline = async () => {
    Keyboard.dismiss();
    setSaving(true);
    setError(null);

    try {
      const nextTitle = title.trim();
      const nextCountry = (selectedCountry || countryQuery).trim();
      const nextCity = (selectedCity || cityQuery).trim();

      if (!nextTitle) {
        setError("제목을 입력해주세요.");
        return;
      }
      if (!nextCountry || !nextCity) {
        setError("나라와 도시를 입력해주세요.");
        return;
      }

      const finalNote = readNoteFromBlocks(contentBlocks);
      const finalPhotoUris = readPhotoUrisFromBlocks(contentBlocks).map(normalizePhotoRef);

      if (editingPageId) {
        const updated = await updateVoyagePage(editingPageId, {
          title: nextTitle,
          country: nextCountry,
          city: nextCity,
          note: finalNote,
          stamps,
          photoUri: finalPhotoUris[0],
          photoUris: finalPhotoUris,
        });
        setPages((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        if (pages.length >= MAX_PAGES) {
          setError("최대 30페이지까지 추가할 수 있습니다.");
          return;
        }
        const created = await saveVoyagePage({
          title: nextTitle,
          country: nextCountry,
          city: nextCity,
          note: finalNote,
          stamps,
          photoUri: finalPhotoUris[0],
          photoUris: finalPhotoUris,
        });
        setPages((prev) => {
          const next = [...prev, created];
          setActivePageIndex(0);
          return next;
        });
      }

      setEditorVisible(false);
      resetEditor();
    } catch {
      setError("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const openEditorForPage = (page: VoyagePage) => {
    const pageUris = (page.photoUris && page.photoUris.length > 0 ? page.photoUris : page.photoUri ? [page.photoUri] : []).map(normalizePhotoRef);
    const trailingTextId = makeBlockId();
    const blocks: EditorBlock[] = [
      { id: makeBlockId(), type: "text", value: page.note || "" },
      ...(pageUris.length > 0 ? [{ id: makeBlockId(), type: "imageStack" as const, uris: pageUris, offsetX: 0, offsetY: 0 }] : []),
      { id: trailingTextId, type: "text", value: "" },
    ];
    setEditingPageId(page.id);
    setTitle(page.title || "");
    setSelectedCountry(page.country || "");
    setCountryQuery(page.country || "");
    setSelectedCity(page.city || "");
    setCityQuery(page.city || "");
    setContentBlocks(blocks);
    setActiveTextBlockId(trailingTextId);
    setActiveSelection({ start: 0, end: 0 });
    setStamps(page.stamps ?? []);
    setSelectedStampId(null);
    setError(null);
    setPlanPickerVisible(false);
    setEditorVisible(true);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => {
          return Math.abs(gesture.dx) > 14 && Math.abs(gesture.dx) > Math.abs(gesture.dy);
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx > 50) {
            if (activePageIndex <= 0) {
              closePassport();
            } else {
              setActivePageIndex((prev) => Math.max(0, prev - 1));
            }
            return;
          }
          if (gesture.dx < -50) {
            setActivePageIndex((prev) => Math.min(Math.max(0, orderedPages.length - 1), prev + 1));
          }
        },
      }),
    [activePageIndex, editorVisible, orderedPages.length],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: themeColors.accent }]}>My Stamp Passport</Text>
          <Pressable style={styles.headerGearBtn} onPress={() => setThemePickerVisible(true)}>
            <Ionicons name="settings-outline" size={20} color={themeColors.accent} />
          </Pressable>
        </View>
        <Text style={styles.headerSub}>여권 필드 어디서든 좌우 스와이프로 페이지 이동/커버 복귀</Text>

        <View style={styles.stageFrame}>
          <View style={[styles.passportStage, { width: stageWidth, height: stageHeight, backgroundColor: themeColors.stageBg }]}> 
            <Animated.View
              {...panResponder.panHandlers}
              pointerEvents={opened ? "auto" : "none"}
              style={[styles.insideLayer, { opacity: insideOpacity }]}
            >
              <View style={[styles.paperSheet, { backgroundColor: stampTheme === "pastelBlue" ? "#F2F8FF" : "#FAF6ED", borderColor: stampTheme === "pastelBlue" ? "#C9DDF8" : "#E6DDCA" }]}>
                <View style={styles.paperTopRow}>
                  <View style={styles.paperTopSide}>
                    {!editorVisible ? (
                      <Pressable
                        style={[
                          styles.sheetTopBtn,
                          { backgroundColor: themeColors.btnBg, borderColor: themeColors.btnBorder },
                          !currentPage ? [styles.sheetTopBtnDisabled, { backgroundColor: themeColors.btnDisabledBg, borderColor: themeColors.btnDisabledBorder }] : null,
                        ]}
                        onPress={() => {
                          if (!currentPage) return;
                          openEditorForPage(currentPage);
                        }}
                        disabled={!currentPage}
                      >
                        <Text style={[styles.sheetTopBtnText, { color: themeColors.btnText }, !currentPage ? [styles.sheetTopBtnTextDisabled, { color: themeColors.btnDisabledText }] : null]}>
                          편집
                        </Text>
                      </Pressable>
                    ) : (
                      <View style={styles.paperTopSidePlaceholder} />
                    )}
                  </View>
                  <Text style={[styles.paperBrand, { color: stampTheme === "pastelBlue" ? "#5B7EA8" : "#9A8D71" }]}>Tripvive</Text>
                  <View style={styles.paperTopSideRight}>
                    {editorVisible ? (
                      <Pressable
                        style={[styles.sheetTopBtn, styles.sheetTopBtnWide, { backgroundColor: themeColors.btnBg, borderColor: themeColors.btnBorder }]}
                        onPress={() => setPlanPickerVisible((prev) => !prev)}
                      >
                        <Text style={[styles.sheetTopBtnText, { color: themeColors.btnText }]}>계획 불러오기</Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        style={[styles.sheetTopBtn, styles.sheetTopBtnCompact, { backgroundColor: themeColors.btnBg, borderColor: themeColors.btnBorder }]}
                        onPress={openInlineEditor}
                      >
                        <Text style={[styles.sheetTopBtnText, { color: themeColors.btnText }]}>Add{"\n"}Stamp</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
                <View style={[styles.paperRule, { backgroundColor: stampTheme === "pastelBlue" ? "#C9DDF8" : "#E6DDCA" }]} />

                <View style={styles.paperBody}>
                  {!editorVisible ? (
                    <View style={styles.sheetHeader}>
                      <View />
                      <Text style={styles.sheetCount}>{pages.length}/{MAX_PAGES}</Text>
                    </View>
                  ) : null}

                  {editorVisible ? (
                    <View
                      style={styles.inlineEditorCard}
                      onLayout={(event) => {
                        setEditorCanvasSize({
                          width: Math.max(1, event.nativeEvent.layout.width),
                          height: Math.max(1, event.nativeEvent.layout.height),
                        });
                      }}
                    >
                      <View pointerEvents="box-none" style={styles.stampLayer}>
                        {stamps.map((stamp) => {
                          const size = 72 * stamp.scale;
                          return (
                            <Pressable
                              key={stamp.id}
                              onPress={() => setSelectedStampId(stamp.id)}
                              style={[
                                styles.stampItem,
                                {
                                  width: size,
                                  height: size,
                                  left: stamp.x * editorCanvasSize.width - size / 2,
                                  top: stamp.y * editorCanvasSize.height - size / 2,
                                  transform: [{ rotate: `${stamp.rotation}deg` }],
                                  borderColor: selectedStampId === stamp.id ? "#2F66D0" : "transparent",
                                },
                              ]}
                            >
                              {stamp.uri ? (
                                <Image source={{ uri: stamp.uri }} style={styles.stampImage} />
                              ) : (
                                <View
                                  style={[
                                    styles.stampPresetBadge,
                                    {
                                      borderColor: `${(STAMP_PRESETS.find((item) => item.key === stamp.presetKey)?.tint ?? "#2E7D5B")}AA`,
                                    },
                                  ]}
                                >
                                  <Ionicons
                                    name={(STAMP_PRESETS.find((item) => item.key === stamp.presetKey)?.icon as any) ?? "star"}
                                    size={32}
                                    color={STAMP_PRESETS.find((item) => item.key === stamp.presetKey)?.tint ?? "#2E7D5B"}
                                  />
                                </View>
                              )}
                            </Pressable>
                          );
                        })}
                      </View>

                      {planPickerVisible ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.planChipsRow}>
                          {plans.length === 0 ? <Text style={styles.planEmpty}>마이에 저장된 계획이 없습니다.</Text> : null}
                          {plans.map((plan) => (
                            <Pressable key={plan.id} style={styles.planChip} onPress={() => applyPlanToEditor(plan)}>
                              <Text style={styles.planChipText}>{plan.city}, {plan.country}</Text>
                            </Pressable>
                          ))}
                        </ScrollView>
                      ) : null}

                      <TextInput
                        value={title}
                        onChangeText={setTitle}
                        placeholder="제목"
                        placeholderTextColor="#9D9077"
                        style={styles.inlineTitleInput}
                        inputAccessoryViewID={Platform.OS === "ios" ? INPUT_ACCESSORY_ID : undefined}
                        returnKeyType="done"
                        onSubmitEditing={() => Keyboard.dismiss()}
                      />

                      <View style={styles.destinationRow}>
                        <View style={styles.destinationFieldWrap}>
                          <TextInput
                            value={countryQuery}
                            onChangeText={(value) => {
                              setCountryQuery(value);
                              setSelectedCountry("");
                              setCityQuery("");
                              setSelectedCity("");
                            }}
                            placeholder="나라"
                            placeholderTextColor="#9D9077"
                            style={[styles.inlineInput, styles.destinationField]}
                            inputAccessoryViewID={Platform.OS === "ios" ? INPUT_ACCESSORY_ID : undefined}
                            returnKeyType="done"
                            onSubmitEditing={() => Keyboard.dismiss()}
                          />
                          {selectedCountry ? <Text style={styles.tagChip}>#{selectedCountry}</Text> : null}
                          {!selectedCountry && countryQuery.trim().length > 0 && countrySuggestions.length > 0 ? (
                            <View style={styles.suggestionWrap}>
                              {countrySuggestions.map((item) => (
                                <Pressable
                                  key={item}
                                  style={styles.suggestionChip}
                                  onPress={() => {
                                    setSelectedCountry(item);
                                    setCountryQuery(item);
                                    setCityQuery("");
                                    setSelectedCity("");
                                  }}
                                >
                                  <Text style={styles.suggestionText}>{item}</Text>
                                </Pressable>
                              ))}
                            </View>
                          ) : null}
                        </View>

                        <View style={styles.destinationFieldWrap}>
                          <TextInput
                            value={cityQuery}
                            onChangeText={(value) => {
                              setCityQuery(value);
                              setSelectedCity("");
                            }}
                            placeholder="도시"
                            placeholderTextColor="#9D9077"
                            style={[styles.inlineInput, styles.destinationField]}
                            inputAccessoryViewID={Platform.OS === "ios" ? INPUT_ACCESSORY_ID : undefined}
                            returnKeyType="done"
                            onSubmitEditing={() => Keyboard.dismiss()}
                          />
                          {selectedCity ? <Text style={styles.tagChip}>#{selectedCity}</Text> : null}
                          {!selectedCity && cityQuery.trim().length > 0 && citySuggestions.length > 0 ? (
                            <View style={styles.suggestionWrap}>
                              {citySuggestions.map((item) => (
                                <Pressable
                                  key={item}
                                  style={styles.suggestionChip}
                                  onPress={() => {
                                    setSelectedCity(item);
                                    setCityQuery(item);
                                  }}
                                >
                                  <Text style={styles.suggestionText}>{item}</Text>
                                </Pressable>
                              ))}
                            </View>
                          ) : null}
                        </View>
                      </View>

                      <View style={styles.noteWrap}>
                        <ScrollView
                          style={styles.richEditorScroll}
                          contentContainerStyle={styles.richEditorContent}
                          scrollEnabled={!draggingStackId && !pressingStackId}
                          keyboardShouldPersistTaps="handled"
                          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
                          onScrollBeginDrag={() => Keyboard.dismiss()}
                          showsVerticalScrollIndicator
                        >
                          {contentBlocks.map((block, idx) =>
                            block.type === "text" ? (
                              <View key={block.id} style={styles.blockRow}>
                                <TextInput
                                ref={(node) => {
                                  textInputRefs.current[block.id] = node;
                                }}
                                value={block.value}
                                onFocus={() => {
                                  setStackDeleteTargetId(null);
                                  setActiveTextBlockId(block.id);
                                  const sel = textSelectionsRef.current[block.id] ?? { start: block.value.length, end: block.value.length };
                                  insertionTargetRef.current = { id: block.id, selection: sel };
                                }}
                                onSelectionChange={(event) => {
                                  textSelectionsRef.current[block.id] = event.nativeEvent.selection;
                                  setActiveTextBlockId(block.id);
                                  setActiveSelection(event.nativeEvent.selection);
                                  insertionTargetRef.current = { id: block.id, selection: event.nativeEvent.selection };
                                }}
                                onChangeText={(value) =>
                                  setContentBlocks((prev) =>
                                    prev.map((item) => (item.id === block.id && item.type === "text" ? { ...item, value } : item)),
                                  )
                                }
                                onKeyPress={({ nativeEvent }) => {
                                  if (nativeEvent.key !== "Backspace") return;
                                  if (activeTextBlockId !== block.id) return;
                                  const cursorAtStart = activeSelection.start === 0 && activeSelection.end === 0;
                                  if (!cursorAtStart || block.value.length > 0) return;
                                  setContentBlocks((prev) => {
                                    const idxInPrev = prev.findIndex((item) => item.id === block.id && item.type === "text");
                                    if (idxInPrev <= 0) return prev;
                                    const previous = prev[idxInPrev - 1];
                                    if (!previous || previous.type !== "imageStack") return prev;
                                    return [...prev.slice(0, idxInPrev - 1), ...prev.slice(idxInPrev)];
                                  });
                                }}
                                placeholder={idx === 0 ? "내용" : ""}
                                placeholderTextColor="#9D9077"
                                style={styles.inlineNoteInput}
                                inputAccessoryViewID={Platform.OS === "ios" ? INPUT_ACCESSORY_ID : undefined}
                                multiline
                              />
                              </View>
                            ) : (
                              <View key={block.id} style={styles.inlineStackWrap}>
                                {(() => {
                                  const panHandlers = buildStackPanHandlers(block);
                                  return (
                                    <Animated.View
                                      {...panHandlers}
                                      style={[
                                        styles.inlineStackPressable,
                                        pressingStackId === block.id && !draggingStackId ? styles.inlineStackPressing : null,
                                        draggingStackId === block.id ? styles.inlineStackDragging : null,
                                        {
                                          transform: [
                                            {
                                              translateX:
                                                draggingStackId === block.id
                                                  ? dragOffsetXAnim
                                                  : dropPreview?.id === block.id
                                                    ? dropPreview.x
                                                    : block.offsetX,
                                            },
                                            {
                                              translateY:
                                                draggingStackId === block.id
                                                  ? dragOffsetYAnim
                                                  : dropPreview?.id === block.id
                                                    ? dropPreview.y
                                                    : block.offsetY,
                                            },
                                            {
                                              translateY:
                                                draggingStackId === block.id
                                                  ? dragLiftAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -24] })
                                                  : 0,
                                            },
                                            {
                                              scale:
                                                draggingStackId === block.id
                                                  ? dragLiftAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] })
                                                  : 1,
                                            },
                                          ],
                                        },
                                      ]}
                                    >
                                      {stackDeleteTargetId === block.id ? (
                                        <Pressable
                                          style={styles.stackDeletePopover}
                                          hitSlop={8}
                                          onPress={() => removeImageStack(block.id)}
                                        >
                                          <Ionicons name="trash-outline" size={12} color="#FFFFFF" />
                                          <Text style={styles.stackDeletePopoverText}>전체 삭제</Text>
                                        </Pressable>
                                      ) : null}
                                      <View style={styles.inlineStackCards}>
                                        {block.uris.slice(0, 3).map((uri, stackIdx) => {
                                          const displayUri = resolveDisplayUri(uri);
                                          return displayUri ? (
                                            <Image
                                              key={`${uri}-${stackIdx}`}
                                              source={{ uri: displayUri }}
                                              style={[
                                                styles.inlinePhotoPreview,
                                                {
                                                  transform: [{ translateX: stackIdx * 10 }, { translateY: stackIdx * 2 }, { rotate: `${stackIdx * 2}deg` }],
                                                },
                                              ]}
                                            />
                                          ) : (
                                            <View
                                              key={`${uri}-${stackIdx}`}
                                              style={[
                                                styles.inlinePhotoPreview,
                                                styles.inlinePhotoPreviewPlaceholder,
                                                {
                                                  transform: [{ translateX: stackIdx * 10 }, { translateY: stackIdx * 2 }, { rotate: `${stackIdx * 2}deg` }],
                                                },
                                              ]}
                                            >
                                              <Ionicons name="image-outline" size={16} color="#7B8794" />
                                            </View>
                                          );
                                        })}
                                      </View>
                                      <View style={styles.photoCountBadge}>
                                        <Text style={styles.photoCountText}>+{block.uris.length}</Text>
                                      </View>
                                    </Animated.View>
                                  );
                                })()}
                              </View>
                            ),
                          )}
                        </ScrollView>
                        <View style={styles.noteTools}>
                          <Pressable
                            ref={photoBtnRef as any}
                            style={[styles.ghostBtn, { backgroundColor: themeColors.btnBg, borderColor: themeColors.btnBorder }]}
                            onPress={() => {
                              setStackDeleteTargetId(null);
                              void openPhotoPicker();
                            }}
                          >
                            <Text style={[styles.ghostBtnText, { color: themeColors.btnText }]}>사진 추가</Text>
                          </Pressable>
                          <Pressable
                            ref={stampBtnRef as any}
                            style={[styles.ghostBtn, { backgroundColor: themeColors.btnBg, borderColor: themeColors.btnBorder }]}
                            onPress={() => {
                              setStackDeleteTargetId(null);
                              void openStampPicker();
                            }}
                          >
                            <Text style={[styles.ghostBtnText, { color: themeColors.btnText }]}>스탬프 추가</Text>
                          </Pressable>
                        </View>
                      </View>

                      {selectedStampId ? (
                        <View style={styles.stampControls}>
                          <Text style={styles.stampControlsLabel}>선택 스탬프 조절</Text>
                          <View style={styles.stampControlsRow}>
                            <Pressable
                              style={[styles.ctrlBtn, { backgroundColor: themeColors.btnBg, borderColor: themeColors.btnBorder }]}
                              onPress={() => adjustSelectedStamp({ scale: (stamps.find((s) => s.id === selectedStampId)?.scale || 1) - 0.1 })}
                            >
                              <Text style={[styles.ctrlText, { color: themeColors.btnText }]}>크기 -</Text>
                            </Pressable>
                            <Pressable
                              style={[styles.ctrlBtn, { backgroundColor: themeColors.btnBg, borderColor: themeColors.btnBorder }]}
                              onPress={() => adjustSelectedStamp({ scale: (stamps.find((s) => s.id === selectedStampId)?.scale || 1) + 0.1 })}
                            >
                              <Text style={[styles.ctrlText, { color: themeColors.btnText }]}>크기 +</Text>
                            </Pressable>
                            <Pressable
                              style={[styles.ctrlBtn, { backgroundColor: themeColors.btnBg, borderColor: themeColors.btnBorder }]}
                              onPress={() => adjustSelectedStamp({ rotation: (stamps.find((s) => s.id === selectedStampId)?.rotation || 0) - 15 })}
                            >
                              <Text style={[styles.ctrlText, { color: themeColors.btnText }]}>각도 -</Text>
                            </Pressable>
                            <Pressable
                              style={[styles.ctrlBtn, { backgroundColor: themeColors.btnBg, borderColor: themeColors.btnBorder }]}
                              onPress={() => adjustSelectedStamp({ rotation: (stamps.find((s) => s.id === selectedStampId)?.rotation || 0) + 15 })}
                            >
                              <Text style={[styles.ctrlText, { color: themeColors.btnText }]}>각도 +</Text>
                            </Pressable>
                            <Pressable
                              style={[styles.ctrlBtn, { backgroundColor: themeColors.btnBg, borderColor: themeColors.btnBorder }]}
                              onPress={() => {
                                setStamps((prev) => prev.filter((s) => s.id !== selectedStampId));
                                setSelectedStampId(null);
                              }}
                            >
                              <Text style={[styles.ctrlText, { color: themeColors.btnText }]}>삭제</Text>
                            </Pressable>
                          </View>
                        </View>
                      ) : null}

                      {error ? <Text style={styles.errorInline}>{error}</Text> : null}

                      <View style={styles.inlineActionsRow}>
                        <Pressable
                          onPress={() => {
                            setEditorVisible(false);
                            resetEditor();
                          }}
                        >
                          <Text style={styles.inlineCancel}>취소</Text>
                        </Pressable>
                        <Pressable onPress={() => void saveInline()} disabled={saving}>
                          <Text style={styles.inlineSave}>{saving ? "저장중..." : "저장"}</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <>
                      <View style={styles.sliderWrap} onLayout={(event) => setSliderWidth(event.nativeEvent.layout.width)}>
                        {pages.length === 0 ? (
                          <View style={styles.slideEmpty}>
                            <Text style={styles.slideEmptyText}>아직 페이지가 없습니다.</Text>
                            <Text style={styles.slideEmptySub}>Add Stamp를 눌러 첫 페이지를 추가하세요.</Text>
                          </View>
                        ) : (
                          <Animated.ScrollView
                            ref={(node) => {
                              sliderRef.current = node;
                            }}
                            horizontal
                            pagingEnabled
                            decelerationRate="fast"
                            bounces={false}
                            showsHorizontalScrollIndicator={false}
                            onScroll={Animated.event(
                              [{ nativeEvent: { contentOffset: { x: pageScrollX } } }],
                              { useNativeDriver: true },
                            )}
                            scrollEventThrottle={16}
                            onMomentumScrollEnd={(event) => {
                              if (sliderWidth <= 0) return;
                              const index = Math.round(event.nativeEvent.contentOffset.x / sliderWidth);
                              setActivePageIndex(Math.max(0, Math.min(index, orderedPages.length - 1)));
                            }}
                          >
                            {orderedPages.map((page, idx) => {
                              const rawPhotoUris = page.photoUris && page.photoUris.length > 0 ? page.photoUris : page.photoUri ? [page.photoUri] : [];
                              const safePhotoUris = rawPhotoUris
                                .map((uri) => resolveDisplayUri(uri))
                                .filter((uri): uri is string => !!uri);
                              const inputRange = [
                                (idx - 1) * (sliderWidth || 1),
                                idx * (sliderWidth || 1),
                                (idx + 1) * (sliderWidth || 1),
                              ];
                              const rotateY = pageScrollX.interpolate({
                                inputRange,
                                outputRange: ["10deg", "0deg", "-10deg"],
                                extrapolate: "clamp",
                              });
                              const scale = pageScrollX.interpolate({
                                inputRange,
                                outputRange: [0.94, 1, 0.94],
                                extrapolate: "clamp",
                              });
                              const opacity = pageScrollX.interpolate({
                                inputRange,
                                outputRange: [0.75, 1, 0.75],
                                extrapolate: "clamp",
                              });
                              return (
                              <Animated.View
                                key={page.id}
                                style={[
                                  styles.slideCard,
                                  { width: sliderWidth || 1, opacity, transform: [{ perspective: 1100 }, { rotateY }, { scale }] },
                                ]}
                              >
                                <View style={styles.savedPageBody}>
                                  <Text style={styles.slideTitle}>{displaySlideTitle(page)}</Text>
                                  <Text style={styles.slideMeta}>{page.country} | {page.city}</Text>
                                  <ScrollView
                                    style={styles.savedPageScroll}
                                    contentContainerStyle={styles.savedPageScrollContent}
                                    keyboardShouldPersistTaps="handled"
                                    showsVerticalScrollIndicator={false}
                                  >
                                    {page.note ? <Text style={styles.savedPageNote}>{page.note}</Text> : null}
                                    {safePhotoUris.length > 0 ? (
                                      <Pressable
                                        style={styles.savedPhotoStack}
                                        onPress={() => openStackGallery(rawPhotoUris)}
                                      >
                                        {safePhotoUris
                                          .slice(0, 3)
                                          .map((uri, photoIdx) => (
                                            <Image
                                              key={`${page.id}-saved-${photoIdx}`}
                                              source={{ uri }}
                                              style={[
                                                styles.savedPhotoPreview,
                                                {
                                                  transform: [
                                                    { translateX: photoIdx * 10 },
                                                    { translateY: photoIdx * 3 },
                                                    { rotate: `${photoIdx * 2}deg` },
                                                  ],
                                                },
                                              ]}
                                            />
                                          ))}
                                        <View style={styles.savedPhotoCountBadge}>
                                          <Text style={styles.savedPhotoCountText}>+{safePhotoUris.length}</Text>
                                        </View>
                                      </Pressable>
                                    ) : null}
                                  </ScrollView>
                                  <View pointerEvents="none" style={styles.savedStampLayer}>
                                    {(page.stamps ?? []).map((stamp) => {
                                      const size = 62 * (stamp.scale ?? 1);
                                      return (
                                        <View
                                          key={`${page.id}-${stamp.id}`}
                                          style={[
                                            styles.savedStampItem,
                                            {
                                              width: size,
                                              height: size,
                                              left: (stamp.x ?? 0.5) * (sliderWidth || 1) - size / 2 - 12,
                                              top: (stamp.y ?? 0.5) * 340 - size / 2 + 18,
                                              transform: [{ rotate: `${stamp.rotation ?? 0}deg` }],
                                            },
                                          ]}
                                        >
                                          {stamp.uri ? (
                                            <Image source={{ uri: stamp.uri }} style={styles.stampImage} />
                                          ) : (
                                            <View
                                              style={[
                                                styles.stampPresetBadge,
                                                {
                                                  borderColor: `${(STAMP_PRESETS.find((item) => item.key === stamp.presetKey)?.tint ?? "#2E7D5B")}AA`,
                                                },
                                              ]}
                                            >
                                              <Ionicons
                                                name={(STAMP_PRESETS.find((item) => item.key === stamp.presetKey)?.icon as any) ?? "star"}
                                                size={26}
                                                color={STAMP_PRESETS.find((item) => item.key === stamp.presetKey)?.tint ?? "#2E7D5B"}
                                              />
                                            </View>
                                          )}
                                        </View>
                                      );
                                    })}
                                  </View>
                                </View>
                              </Animated.View>
                              );
                            })}
                          </Animated.ScrollView>
                        )}
                      </View>
                    </>
                  )}
                </View>

                <View pointerEvents="none" style={styles.paperLinesWrap}>
                  {Array.from({ length: 10 }).map((_, idx) => (
                    <View
                      key={`line-${idx}`}
                      style={[styles.paperLine, { backgroundColor: stampTheme === "pastelBlue" ? "rgba(106,146,194,0.28)" : "rgba(163,145,113,0.24)" }]}
                    />
                  ))}
                </View>
              </View>
            </Animated.View>

            <Animated.View
              pointerEvents={opened ? "none" : "auto"}
              style={[
                styles.coverLayer,
                {
                  opacity: coverOpacity,
                  transform: [
                    { perspective: 1400 },
                    { translateX: coverTranslateX },
                    { translateY: coverTranslateY },
                    { rotateY: coverRotate },
                    { scale: coverScale },
                  ],
                },
              ]}
            >
              <Pressable style={StyleSheet.absoluteFill} onPress={togglePassport}>
                <PassportCoverArt style={styles.coverImage} stampCount={pages.length}>
                  <Text style={styles.coverHint}>{opened ? "Tap to close" : "Tap to open passport"}</Text>
                  <View style={styles.coverActions}>
                    <Pressable
                      style={styles.coverActionBtn}
                      onPress={(event) => {
                        event.stopPropagation();
                        setAllModalVisible(true);
                      }}
                    >
                      <Text style={styles.coverActionText}>모든 기록 보기</Text>
                    </Pressable>
                    <Pressable
                      style={styles.coverActionBtn}
                      onPress={(event) => {
                        event.stopPropagation();
                        if (orderedPages.length === 0) {
                          openPassport();
                          return;
                        }
                        setActivePageIndex(0);
                        openPassport();
                      }}
                    >
                      <Text style={styles.coverActionText}>기록 보기</Text>
                    </Pressable>
                  </View>
                </PassportCoverArt>
              </Pressable>
            </Animated.View>
          </View>
        </View>

            <View style={styles.footerActions} />
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>

      <Modal visible={stampPickerVisible} transparent animationType="none" onRequestClose={closeStampPicker}>
        <Pressable style={styles.photoPickerBackdrop} onPress={closeStampPicker}>
          <Animated.View
            onStartShouldSetResponder={() => true}
            style={[
              styles.stampPickerModal,
              {
                position: "absolute",
                width: 220,
                left: Math.max(12, Math.min(width - 232, stampPickerAnchor.x - 204)),
                top: Math.max(88, stampPickerAnchor.y - 180),
                opacity: stampPickerOpacity,
                transform: [{ scale: stampPickerScale }],
              },
            ]}
          >
            <Text style={styles.stampPickerTitle}>스탬프 선택</Text>
            <View style={styles.stampPickerGrid}>
              {STAMP_PRESETS.map((preset) => (
                <Pressable key={preset.key} style={styles.stampPickerItem} onPress={() => addPresetStamp(preset.key)}>
                  <Ionicons name={preset.icon as any} size={20} color={preset.tint} />
                  <Text style={styles.stampPickerItemText}>{preset.key}</Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        </Pressable>
      </Modal>

      <Modal visible={themePickerVisible} transparent animationType="fade" onRequestClose={() => setThemePickerVisible(false)}>
        <Pressable style={styles.photoPickerBackdrop} onPress={() => setThemePickerVisible(false)}>
          <View style={styles.themeModal}>
            <Text style={styles.themeTitle}>여권 테마</Text>
            <Pressable
              style={[styles.themeOption, stampTheme === "classic" ? styles.themeOptionActive : null]}
              onPress={() => {
                setStampTheme("classic");
                setThemePickerVisible(false);
              }}
            >
              <View style={[styles.themeDot, { backgroundColor: STAMP_THEME_COLORS.classic.stageBg }]} />
              <Text style={styles.themeOptionText}>Classic</Text>
            </Pressable>
            <Pressable
              style={[styles.themeOption, stampTheme === "pastelBlue" ? styles.themeOptionActive : null]}
              onPress={() => {
                setStampTheme("pastelBlue");
                setThemePickerVisible(false);
              }}
            >
              <View style={[styles.themeDot, { backgroundColor: STAMP_THEME_COLORS.pastelBlue.stageBg }]} />
              <Text style={styles.themeOptionText}>Pastel Blue</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={photoPickerVisible} transparent animationType="none" onRequestClose={closePhotoPicker}>
        <Pressable style={styles.photoPickerBackdrop} onPress={closePhotoPicker}>
          <Animated.View
            onStartShouldSetResponder={() => true}
            style={[
              styles.photoPickerModal,
              {
                width: Math.min(width - 24, 380),
                maxHeight: Math.min(stageHeight * 0.82, 560),
                position: "absolute",
                left: Math.max(12, Math.min(width - Math.min(width - 24, 380) - 12, photoPickerAnchor.x - Math.min(width - 24, 380) + 36)),
                top: Math.max(80, photoPickerAnchor.y - Math.min(stageHeight * 0.82, 560) + 8),
                opacity: photoPickerOpacity,
                transform: [{ scale: photoPickerScale }],
              },
            ]}
          >
            <View style={styles.photoPickerHeader}>
              <Text style={styles.stampPickerTitle}>사진 선택</Text>
              <Pressable
                style={[styles.photoDoneBtn, { backgroundColor: themeColors.btnBg, borderColor: themeColors.btnBorder }]}
                onPress={() => void applySelectedPhotos()}
              >
                <Text style={[styles.photoDoneText, { color: themeColors.btnText }]}>완료 ({draftPhotoIds.length})</Text>
              </Pressable>
            </View>
            <FlatList
              data={recentPhotos}
              keyExtractor={(item) => item.id}
              numColumns={4}
              contentContainerStyle={styles.photoPickerGrid}
              columnWrapperStyle={styles.photoPickerRow}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
              initialNumToRender={24}
              maxToRenderPerBatch={24}
              updateCellsBatchingPeriod={40}
              windowSize={9}
              removeClippedSubviews
              getItemLayout={(_, index) => {
                const row = Math.floor(index / 4);
                const length = PHOTO_TILE_SIZE + PHOTO_TILE_GAP;
                return { length, offset: length * row, index };
              }}
              onEndReachedThreshold={0.35}
              onEndReached={() => {
                if (!loadingPhotos && hasMorePhotos && photoPickerVisible) {
                  void loadPhotoPage(false, false, photoLoadSessionRef.current);
                }
              }}
              ListEmptyComponent={
                !loadingPhotos ? (
                  <View>
                    <Text style={styles.planEmpty}>표시할 사진이 없습니다.</Text>
                    <Text style={styles.planEmpty}>권한이 제한되어 있으면 사진 접근 범위를 허용해주세요.</Text>
                  </View>
                ) : null
              }
              ListFooterComponent={
                <View>
                  {loadingPhotos ? <Text style={styles.planEmpty}>사진 불러오는 중...</Text> : null}
                  {!hasMorePhotos && recentPhotos.length > 0 ? <Text style={styles.planEmpty}>마지막 사진입니다.</Text> : null}
                </View>
              }
              renderItem={renderPhotoItem}
            />
          </Animated.View>
        </Pressable>
      </Modal>

      <Modal visible={photoGalleryVisible} transparent animationType="fade" onRequestClose={closePhotoViewer}>
        <Pressable style={styles.viewerBackdrop} onPress={closePhotoViewer}>
          <Pressable style={styles.viewerShell} onPress={(event) => event.stopPropagation()}>
            <View style={styles.viewerHeader}>
              <Text style={styles.viewerTitle}>선택한 사진 ({galleryResolvedPhotoUris.length})</Text>
              <Pressable onPress={closePhotoViewer}>
                <Ionicons name="close" size={22} color="#F8FAFC" />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.viewerGrid}>
              {galleryResolvedPhotoUris.length > 0 ? (
                galleryResolvedPhotoUris.map((uri, idx) => (
                  <Pressable
                    key={`${uri}-${idx}`}
                    style={styles.viewerGridItem}
                    onPress={() => {
                      setZoomPhotoUri(uri);
                      setZoomPhotoVisible(true);
                    }}
                  >
                    <Image source={{ uri }} style={styles.viewerGridImage} />
                  </Pressable>
                ))
              ) : (
                <Text style={styles.viewerEmptyText}>사진 미리보기를 준비하는 중입니다.</Text>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal
        visible={zoomPhotoVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setZoomPhotoVisible(false);
          setZoomPhotoUri(null);
        }}
      >
        <Pressable
          style={styles.viewerBackdrop}
          onPress={() => {
            setZoomPhotoVisible(false);
            setZoomPhotoUri(null);
          }}
        >
          <Pressable style={styles.zoomShell} onPress={(event) => event.stopPropagation()}>
            <Pressable
              style={styles.zoomCloseBtn}
              onPress={() => {
                setZoomPhotoVisible(false);
                setZoomPhotoUri(null);
              }}
            >
              <Ionicons name="close" size={22} color="#F8FAFC" />
            </Pressable>
            {zoomPhotoUri ? <Image source={{ uri: zoomPhotoUri }} style={styles.zoomImage} /> : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={allModalVisible} transparent animationType="slide" onRequestClose={() => setAllModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheetLarge}>
            <View style={styles.allHeader}>
              <Text style={styles.modalTitle}>All Stamps</Text>
              <Pressable onPress={() => setAllModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.subText} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.allListWrap}>
              {orderedPages.length === 0 ? <Text style={styles.planEmpty}>No saved stamps yet.</Text> : null}
              {orderedPages.map((page, idx) => (
                <Pressable
                  key={page.id}
                  style={styles.allItem}
                  onPress={() => {
                    setActivePageIndex(idx);
                    setAllModalVisible(false);
                    openPassport();
                  }}
                >
                  <Text style={styles.allItemTitle}>{displaySlideTitle(page)}</Text>
                  <Text style={styles.allItemSub}>{page.country} | {page.city}</Text>
                  <Text style={styles.allItemSub}>Page {page.pageNo}</Text>
                  {page.note ? <Text style={styles.allItemNote}>{page.note}</Text> : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
      {Platform.OS === "ios" ? (
        <InputAccessoryView nativeID={INPUT_ACCESSORY_ID}>
          <View style={styles.inputAccessory}>
            <Pressable style={styles.inputDoneBtn} onPress={() => Keyboard.dismiss()}>
              <Text style={styles.inputDoneText}>Done</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F2F5FC" },
  flex1: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, alignItems: "center" },
  headerRow: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { fontSize: 30, fontWeight: "800", color: "#1E284C" },
  headerGearBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CFE2FF",
    backgroundColor: "#F0F7FF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerSub: { width: "100%", fontSize: 14, fontWeight: "600", color: "#60709A", marginBottom: 10 },
  stageFrame: { paddingTop: 12, paddingBottom: 12, alignItems: "center", justifyContent: "center" },
  passportStage: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#D5DEEE",
    backgroundColor: "#0D1E76",
    shadowColor: "#0F172A",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 7,
  },
  insideLayer: { ...StyleSheet.absoluteFillObject, padding: 12 },
  paperSheet: {
    position: "relative",
    flex: 1,
    borderRadius: 14,
    backgroundColor: "#FAF6ED",
    borderWidth: 1,
    borderColor: "#E6DDCA",
    padding: 12,
    gap: 10,
  },
  paperRule: { height: 1, backgroundColor: "#E6DDCA", marginTop: 2, marginBottom: 2, opacity: 0.65 },
  paperTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 48 },
  paperTopSide: { width: 98, alignItems: "flex-start", justifyContent: "center" },
  paperTopSideRight: { width: 98, alignItems: "flex-end", justifyContent: "center" },
  paperTopSidePlaceholder: { width: 86, height: 34 },
  paperBrand: {
    fontSize: 22,
    fontWeight: "700",
    color: "#9A8D71",
    opacity: 0.4,
    letterSpacing: 1.2,
    textAlign: "center",
  },
  paperBody: { flex: 1, position: "relative", zIndex: 3 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  sheetHeaderRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  sheetTopBtn: {
    borderWidth: 1,
    borderColor: "#BFD7FF",
    borderRadius: 7,
    minWidth: 80,
    minHeight: 32,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: "#EAF3FF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7AA7E8",
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sheetTopBtnCompact: { minWidth: 74 },
  sheetTopBtnWide: { minWidth: 92 },
  sheetTopBtnDisabled: { backgroundColor: "#EEF2F8", borderColor: "#D8DFEA" },
  sheetTopBtnText: { fontSize: 12, lineHeight: 14, color: "#2F5FA8", fontWeight: "800", textAlign: "center" },
  sheetTopBtnTextDisabled: { color: "#8A98AF" },
  sheetTitle: { fontSize: 15, fontWeight: "800", color: "#5F5A4E" },
  sheetCount: { fontSize: 12, color: "#6B7280", fontWeight: "700" },
  sliderWrap: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 4 },
  slideEmpty: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(95,90,78,0.2)",
    backgroundColor: "rgba(255,255,255,0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  slideEmptyText: { fontSize: 16, fontWeight: "800", color: "#6D6555" },
  slideEmptySub: { marginTop: 4, fontSize: 13, color: "#8C816D", fontWeight: "600" },
  slideCard: {
    height: "100%",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(95,90,78,0.2)",
    backgroundColor: "rgba(255,255,255,0.52)",
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 14,
    overflow: "hidden",
  },
  savedPageBody: { flex: 1, borderRadius: 12, padding: 8 },
  savedPageScroll: { flex: 1, marginTop: 8 },
  savedPageScrollContent: { paddingBottom: 20 },
  savedPageNote: { fontSize: 15, lineHeight: 22, color: "#4B463C", fontWeight: "500" },
  savedPhotoStack: { marginTop: 12, width: 132, height: 90, position: "relative" },
  savedPhotoPreview: {
    width: 88,
    height: 88,
    borderRadius: 8,
    position: "absolute",
    left: 0,
    top: 0,
    borderWidth: 1,
    borderColor: "#E2DBCC",
    backgroundColor: "#D5DEEE",
  },
  savedPhotoCountBadge: {
    position: "absolute",
    right: 2,
    bottom: 0,
    borderRadius: 999,
    backgroundColor: "#1E3A8A",
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  savedPhotoCountText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  savedStampLayer: { ...StyleSheet.absoluteFillObject },
  savedStampItem: {
    position: "absolute",
    borderWidth: 0,
    borderRadius: 6,
    overflow: "hidden",
  },
  slideTitle: { fontSize: 17, fontWeight: "800", color: "#4D4538" },
  slideMeta: { fontSize: 13, fontWeight: "700", color: "#7A715F" },
  slideNote: { fontSize: 13, color: "#5B564A", lineHeight: 18, marginTop: 2 },
  inlineEditorCard: {
    flex: 1,
    position: "relative",
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: "transparent",
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 2,
  },
  stampLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  stampItem: {
    position: "absolute",
    borderWidth: 2,
    borderRadius: 6,
    overflow: "hidden",
  },
  stampImage: { width: "100%", height: "100%" },
  stampPresetBadge: {
    width: "100%",
    height: "100%",
    borderWidth: 1.5,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
  },
  ghostBtn: {
    borderWidth: 1,
    borderColor: "#D8D0C0",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#FFF9EE",
  },
  ghostBtnText: { fontSize: 12, color: "#6E624A", fontWeight: "800" },
  planChipsRow: { gap: 6, paddingBottom: 8 },
  planChip: {
    borderWidth: 1,
    borderColor: "#CFD9EE",
    borderRadius: 999,
    backgroundColor: "#EEF4FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  planChipText: { fontSize: 12, color: "#30487A", fontWeight: "700" },
  inlineTitleInput: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "800",
    color: "#111827",
    borderBottomWidth: 1,
    borderBottomColor: "#E2DBCC",
    paddingTop: 2,
    paddingBottom: 6,
    marginBottom: 8,
  },
  destinationRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  destinationFieldWrap: { flex: 1 },
  destinationField: { fontSize: 16, fontWeight: "700" },
  inlineInput: {
    borderWidth: 1,
    borderColor: "#E2DBCC",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: "#121212",
    backgroundColor: "rgba(255,255,255,0.78)",
  },
  suggestionWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  suggestionChip: {
    borderWidth: 1,
    borderColor: "#DCE6F8",
    borderRadius: 999,
    backgroundColor: "#F2F7FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  suggestionText: { fontSize: 11, color: "#37598B", fontWeight: "700" },
  tagChip: {
    marginTop: 5,
    alignSelf: "flex-start",
    backgroundColor: "#ECE7DD",
    color: "#6D6149",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 11,
    fontWeight: "700",
    overflow: "hidden",
  },
  noteWrap: { position: "relative", marginTop: 8, flex: 1 },
  inlineNoteInput: { minHeight: 120, textAlignVertical: "top", fontSize: 16, lineHeight: 22, paddingBottom: 8 },
  richEditorScroll: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E2DBCC",
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.72)",
  },
  richEditorContent: { padding: 8, gap: 6, paddingBottom: 52 },
  inlineStackWrap: {
    width: "100%",
    minHeight: 84,
    borderWidth: 0,
    backgroundColor: "transparent",
    alignSelf: "stretch",
    marginVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  blockRow: { width: "100%" },
  inlineStackPressing: {
    opacity: 0.94,
    shadowColor: "#111827",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  inlineStackDragging: {
    opacity: 0.98,
    zIndex: 40,
    shadowColor: "#0F172A",
    shadowOpacity: 0.36,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
  },
  inlineStackDropHint: {},
  inlineStackPressable: {
    width: 132,
    height: 84,
    position: "relative",
  },
  stackDeletePopover: {
    position: "absolute",
    top: -28,
    left: 18,
    zIndex: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(185,28,28,0.96)",
    shadowColor: "#111827",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  stackDeletePopoverText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  inlineStackCards: { width: 132, height: 84, position: "relative" },
  inlineSideInput: {
    flex: 1,
    minHeight: 36,
    borderWidth: 0,
    fontSize: 15,
    lineHeight: 22,
    color: "#3B352A",
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  noteTools: {
    position: "absolute",
    right: 8,
    bottom: 8,
    flexDirection: "row",
    gap: 6,
  },
  stampPickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.1)",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    zIndex: 40,
  },
  photoPickerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.35)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 20,
  },
  stampPickerModal: {
    width: 220,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D8D0C0",
    backgroundColor: "#FFFCF6",
    padding: 10,
    shadowColor: "#101828",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  stampPickerTitle: { fontSize: 13, fontWeight: "800", color: "#5C543F", marginBottom: 8 },
  stampPickerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  stampPickerItem: {
    width: 62,
    borderWidth: 1,
    borderColor: "#E2DBCC",
    borderRadius: 10,
    backgroundColor: "#FFF4E7",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: 8,
  },
  stampPickerItemText: { fontSize: 10, color: "#6E624A", fontWeight: "700" },
  photoPickerModal: {
    width: 330,
    maxHeight: 420,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D8D0C0",
    backgroundColor: "#FFFCF6",
    padding: 10,
    shadowColor: "#101828",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  themeModal: {
    width: Math.min(320, 360),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D7E6FF",
    backgroundColor: "#F8FBFF",
    padding: 12,
    gap: 8,
  },
  themeTitle: { fontSize: 14, fontWeight: "800", color: "#365E99", marginBottom: 4 },
  themeOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#DCE6F8",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  themeOptionActive: {
    borderColor: "#97C1FF",
    backgroundColor: "#EAF3FF",
  },
  themeDot: { width: 14, height: 14, borderRadius: 7 },
  themeOptionText: { fontSize: 13, color: "#33578C", fontWeight: "700" },
  photoPickerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  photoDoneBtn: {
    borderWidth: 1,
    borderColor: "#D8D0C0",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#FFF9EE",
  },
  photoDoneText: { fontSize: 12, fontWeight: "800", color: "#6E624A" },
  photoPickerGrid: {
    paddingHorizontal: 2,
    paddingBottom: 8,
  },
  photoPickerRow: {
    gap: 8,
    marginBottom: 8,
  },
  photoPickerItem: {
    width: 72,
    height: 72,
    borderWidth: 1,
    borderColor: "#E2DBCC",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#F2F7FF",
  },
  photoSelectedMask: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(47,102,208,0.38)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoRemoveChip: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoThumb: { width: "100%", height: "100%" },
  photoThumbPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EDF2F7",
  },
  stampControls: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E2DBCC",
    borderRadius: 8,
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.75)",
  },
  stampControlsLabel: { fontSize: 12, fontWeight: "700", color: "#6E624A", marginBottom: 6 },
  stampControlsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  ctrlBtn: {
    borderWidth: 1,
    borderColor: "#D8D0C0",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#FFF9EE",
  },
  ctrlText: { fontSize: 11, color: "#6E624A", fontWeight: "700" },
  photoStackCards: { width: 132, height: 90, position: "relative" },
  inlinePhotoPreview: {
    width: 88,
    height: 88,
    borderRadius: 8,
    position: "absolute",
    left: 0,
    top: 0,
    borderWidth: 1,
    borderColor: "#E2DBCC",
    backgroundColor: "#D5DEEE",
  },
  inlinePhotoPreviewPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E9EEF7",
  },
  photoCountBadge: {
    position: "absolute",
    right: 24,
    bottom: 8,
    borderRadius: 999,
    backgroundColor: "#1E3A8A",
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  photoCountText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  errorInline: { marginTop: 4, fontSize: 12, color: "#B42318", fontWeight: "700" },
  inlineActionsRow: { marginTop: "auto", flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 10 },
  inlineCancel: { fontSize: 15, fontWeight: "700", color: "#7A715F" },
  inlineSave: { fontSize: 24, fontWeight: "900", color: "#101828" },
  inputAccessory: {
    borderTopWidth: 1,
    borderTopColor: "#DCE6F8",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "flex-end",
  },
  inputDoneBtn: {
    borderWidth: 1,
    borderColor: "#CFD9EE",
    borderRadius: 999,
    backgroundColor: "#EEF4FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  inputDoneText: { color: "#1E3A8A", fontSize: 14, fontWeight: "800" },
  paperLinesWrap: { position: "absolute", top: 78, left: 12, right: 12, bottom: 12, gap: 12, zIndex: 1 },
  paperLine: { height: 1, backgroundColor: "rgba(163,145,113,0.24)" },
  coverLayer: { ...StyleSheet.absoluteFillObject, borderRadius: 16, overflow: "hidden", zIndex: 3 },
  coverImage: { flex: 1, justifyContent: "flex-end", padding: 16 },
  coverHint: { color: "#E5EFFF", fontWeight: "700", fontSize: 13 },
  coverActions: {
    width: "100%",
    marginTop: 8,
    gap: 8,
  },
  coverActionBtn: {
    height: 38,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.46)",
    alignItems: "center",
    justifyContent: "center",
  },
  coverActionText: { color: "#F5F9FF", fontSize: 13, fontWeight: "800" },
  footerActions: { width: "100%", marginTop: 12 },
  allBtn: {
    height: 48,
    borderRadius: 999,
    backgroundColor: "#1B2A64",
    alignItems: "center",
    justifyContent: "center",
  },
  allBtnText: { fontSize: 16, color: "#FFFFFF", fontWeight: "900", textTransform: "uppercase" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(16,24,40,0.45)", justifyContent: "flex-end" },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.85)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  viewerShell: {
    width: "100%",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(15,23,42,0.8)",
    padding: 12,
    maxHeight: "84%",
  },
  viewerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  viewerTitle: { color: "#F8FAFC", fontWeight: "800", fontSize: 14 },
  viewerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingBottom: 8 },
  viewerGridItem: { width: 92, height: 92, borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  viewerGridImage: { width: "100%", height: "100%" },
  viewerEmptyText: { color: "rgba(248,250,252,0.82)", fontSize: 13, lineHeight: 20, paddingVertical: 10 },
  zoomShell: {
    width: "92%",
    height: "76%",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(15,23,42,0.92)",
    padding: 10,
  },
  zoomCloseBtn: { alignSelf: "flex-end", marginBottom: 8 },
  zoomImage: { width: "100%", height: "100%", resizeMode: "contain", borderRadius: 10, backgroundColor: "rgba(255,255,255,0.06)" },
  modalSheetLarge: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    gap: 10,
    height: "78%",
  },
  allHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  allListWrap: { gap: 10, paddingBottom: 24 },
  allItem: {
    borderWidth: 1,
    borderColor: "#DBE4F5",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#F8FAFF",
    gap: 2,
  },
  allItemTitle: { fontSize: 15, color: "#1D2859", fontWeight: "800" },
  allItemSub: { fontSize: 12, color: "#51608B", fontWeight: "700" },
  allItemNote: { fontSize: 13, color: "#2F3A4A", marginTop: 2 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  planEmpty: { fontSize: 13, color: colors.subText, paddingVertical: 4 },
});




