import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableWithoutFeedback, Dimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  runOnJS,
  withSequence,
  withDelay,
  Easing
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const RADIUS = SCREEN_WIDTH < 400 ? 65 : 80;

const WATER_DROP_DIRECTIONS = [
  { sx: 18, sy: -7, x: 50, y: -20 }, 
  { sx: 0, sy: -20, x: 0, y: -45 }, 
  { sx: -18, sy: -7, x: -50, y: -20 },
  { sx: 20, sy: 3, x: 70, y: 10 },  
  { sx: -20, sy: 3, x: -70, y: 10 },
  { sx: 16, sy: 11, x: 60, y: 40 },  
  { sx: 8, sy: 18, x: 25, y: 60 }, 
  { sx: 0, sy: 20, x: 0, y: 60 },
  { sx: -8, sy: 18, x: -25, y: 60 },
  { sx: -16, sy: 11, x: -60, y: 40 }
];

export default function RoundaboutMenu({ tasks, position, onClose, onComplete, onAddTask }) {
  const [activeTask, setActiveTask] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [isClosing, setIsClosing] = useState(false);

  // Gesture Tracker
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  
  // Outer overlay entrance
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withSpring(1, { damping: 14, stiffness: 180 });
    scale.value = withSpring(1, { damping: 14, stiffness: 180 });
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    opacity.value = withTiming(0, { duration: 250 });
    scale.value = withTiming(0.8, { duration: 250 });
    setTimeout(onClose, 250);
  };

  const isRightEdge = position.x > SCREEN_WIDTH * 0.7;
  const isLeftEdge = position.x < SCREEN_WIDTH * 0.3;

  const bubblePositions = useMemo(() => {
    const numTasks = tasks.length;
    const total = numTasks + 1;
    const PLUS_ANGLE = Math.PI * 0.5;

    if (!isLeftEdge && !isRightEdge) {
      const positions = tasks.map((task, i) => {
        const angle = PLUS_ANGLE + ((i + 1) * (Math.PI * 2)) / total;
        return { id: task.id, task, x: Math.cos(angle) * RADIUS, y: Math.sin(angle) * RADIUS };
      });
      positions.push({ id: 'create', isCreate: true, x: Math.cos(PLUS_ANGLE) * RADIUS, y: Math.sin(PLUS_ANGLE) * RADIUS });
      return positions;
    }
    
    const sweepDir = isLeftEdge ? -1 : 1; 
    const sweepArc = Math.PI;
    const positions = tasks.map((task, i) => {
      const angle = PLUS_ANGLE + (sweepDir * sweepArc * (i + 1) / (total - 1));
      return { id: task.id, task, x: Math.cos(angle) * RADIUS, y: Math.sin(angle) * RADIUS };
    });
    positions.push({ id: 'create', isCreate: true, x: Math.cos(PLUS_ANGLE) * RADIUS, y: Math.sin(PLUS_ANGLE) * RADIUS });
    
    return positions;
  }, [tasks, position.x]);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;

      let closest = null;
      let minDist = 65;
      
      bubblePositions.forEach((bp) => {
        const dist = Math.sqrt(Math.pow(e.translationX - bp.x, 2) + Math.pow(e.translationY - bp.y, 2));
        if (dist < minDist) {
          minDist = dist;
          closest = bp.isCreate ? 'create' : bp.task.id;
        }
      });
      
      if (closest !== activeTask) {
        runOnJS(setActiveTask)(closest);
      }
    })
    .onEnd((e) => {
      const distTracker = Math.sqrt(e.translationX*e.translationX + e.translationY*e.translationY);
      
      if (activeTask && distTracker > 30) {
        runOnJS(setSelectedId)(activeTask);
        
        // Wait 500ms for water burst before firing close
        setTimeout(() => {
          if (activeTask === 'create') onAddTask();
          else onComplete(activeTask);
          handleClose();
        }, 500);
      } else {
        runOnJS(setActiveTask)(null);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    left: position.x,
    top: position.y,
  }));

  const knobStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -24 + translateX.value },
      { translateY: -24 + translateY.value }
    ],
    opacity: selectedId ? 0.2 : 1
  }));

  return (
    <TouchableWithoutFeedback onPress={handleClose}>
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
          <Animated.View style={[styles.container, containerStyle]}>
            
            {/* Bubbles */}
            {bubblePositions.map((bp) => {
              const id = bp.isCreate ? 'create' : bp.task.id;
              const isActive = activeTask === id;
              const isSelected = selectedId === id;
              const isFadingOut = selectedId && !isSelected;
              
              return (
                <Bubble 
                  key={id}
                  bp={bp}
                  isActive={isActive}
                  isSelected={isSelected}
                  isFadingOut={isFadingOut}
                  onTap={() => {
                    setSelectedId(id);
                    setTimeout(() => {
                      if (bp.isCreate) onAddTask();
                      else onComplete(bp.task.id);
                      handleClose();
                    }, 500);
                  }}
                />
              );
            })}

            {/* Gesture Knob */}
            <GestureDetector gesture={panGesture}>
              <Animated.View style={[styles.knob, knobStyle]}>
                <View style={styles.knobInner} />
              </Animated.View>
            </GestureDetector>

          </Animated.View>
        </TouchableWithoutFeedback>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

function Bubble({ bp, isActive, isSelected, isFadingOut, onTap }) {
  const scale = useSharedValue(1);

  // Dynamic Scaling
  useEffect(() => {
    if (isSelected) {
      scale.value = withSequence(
        withSpring(2.2, { damping: 10, stiffness: 200 }),
        withTiming(0.1, { duration: 150 })
      );
    } else {
      scale.value = withSpring(isActive ? 1.4 : 1, { damping: 12, stiffness: 350 });
    }
  }, [isActive, isSelected]);

  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -24 + bp.x },
      { translateY: -24 + bp.y },
      { scale: scale.value }
    ],
    opacity: isFadingOut ? withTiming(0, { duration: 200 }) : 1
  }));

  const droplets = useMemo(() => {
    if (!isSelected) return [];
    return WATER_DROP_DIRECTIONS.map((dir) => {
      const rx = dir.x + (Math.random() * 30 - 15);
      const ry = dir.y + (Math.random() * 30 - 15);
      const duration = 0.3 + Math.random() * 0.3;
      const baseSize = Math.max(3, (dir.s || 5) + Math.floor(Math.random() * 5 - 2));
      const size = Math.round(baseSize * 1.2);
      
      return { 
        rx, ry, sx: dir.sx, sy: dir.sy, size, duration 
      };
    });
  }, [isSelected]);

  const color = bp.isCreate ? '#a48cff' : bp.task.color;

  return (
    <>
      {!isSelected && (
        <TouchableWithoutFeedback onPress={onTap}>
          <Animated.View style={[styles.bubble, bubbleStyle, { backgroundColor: color }]}>
            <Text style={styles.bubbleText}>
              {bp.isCreate ? '+' : bp.task.name.substring(0, 1).toUpperCase()}
            </Text>
          </Animated.View>
        </TouchableWithoutFeedback>
      )}

      {isSelected && droplets.map((rd, i) => (
        <Droplet key={i} config={rd} color={color} originX={bp.x} originY={bp.y} />
      ))}
    </>
  );
}

function Droplet({ config, color, originX, originY }) {
  const x = useSharedValue(originX + config.sx);
  const y = useSharedValue(originY + config.sy);
  const opacity = useSharedValue(1);

  useEffect(() => {
    x.value = withTiming(originX + config.rx, { duration: config.duration * 1000, easing: Easing.out(Easing.quad) });
    y.value = withTiming(originY + config.ry, { duration: config.duration * 1000, easing: Easing.in(Easing.quad) });
    opacity.value = withDelay(config.duration * 600, withTiming(0, { duration: config.duration * 400 }));
  }, [config]);

  const dropStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value - config.size/2 },
      { translateY: y.value - config.size/2 }
    ],
    opacity: opacity.value,
    width: config.size,
    height: config.size,
    borderRadius: config.size / 2,
    backgroundColor: color,
  }));

  return <Animated.View style={[styles.droplet, dropStyle]} />;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 1000,
  },
  container: {
    position: 'absolute',
    width: 0,
    height: 0,
  },
  knob: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  knobInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  bubble: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  bubbleText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  droplet: {
    position: 'absolute',
  }
});
