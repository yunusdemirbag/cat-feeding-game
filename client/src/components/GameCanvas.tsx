import { useEffect, useRef, useState } from "react";
import { useCatGame } from "../lib/stores/useCatGame";
import { useAudio } from "../lib/stores/useAudio";

interface Cat {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  currentNeed: 'food' | 'water' | null;
}

interface Item {
  id: string;
  type: 'food' | 'water';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  originalX: number;
  originalY: number;
  isDragging: boolean;
}

interface SpeechBubble {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  timestamp: number;
}

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { 
    score, 
    level, 
    timeLeft, 
    gameRunning, 
    gamePhase,
    incrementScore, 
    decrementTime, 
    endGame,
    levelUp
  } = useCatGame();
  
  const { playHit, playSuccess } = useAudio();
  
  const [cats, setCats] = useState<Cat[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [draggedItem, setDraggedItem] = useState<Item | null>(null);
  const [speechBubbles, setSpeechBubbles] = useState<SpeechBubble[]>([]);
  const [currentRequest, setCurrentRequest] = useState<{ cat: Cat; need: 'food' | 'water' } | null>(null);

  // Initialize game objects
  useEffect(() => {
    if (gamePhase === 'playing') {
      const initialCats: Cat[] = [
        {
          id: 'misa',
          name: 'Mişa',
          x: Math.random() * 200 + 50,
          y: Math.random() * 150 + 350,
          width: 80,
          height: 80,
          color: '#666',
          currentNeed: null
        },
        {
          id: 'pars',
          name: 'Pars',
          x: Math.random() * 200 + 150,
          y: Math.random() * 150 + 350,
          width: 80,
          height: 80,
          color: '#DAA520',
          currentNeed: null
        }
      ];

      const initialItems: Item[] = [
        {
          id: 'food',
          type: 'food',
          x: 50,
          y: 600,
          width: 60,
          height: 60,
          color: '#8B4513',
          originalX: 50,
          originalY: 600,
          isDragging: false
        },
        {
          id: 'water',
          type: 'water',
          x: 290,
          y: 600,
          width: 60,
          height: 60,
          color: '#4169E1',
          originalX: 290,
          originalY: 600,
          isDragging: false
        }
      ];

      setCats(initialCats);
      setItems(initialItems);
      startNewRequest(initialCats);
    }
  }, [gamePhase]);

  // Game timer
  useEffect(() => {
    if (gamePhase === 'playing' && timeLeft > 0) {
      const timer = setTimeout(() => {
        decrementTime();
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft <= 0 && gamePhase === 'playing') {
      endGame();
    }
  }, [timeLeft, gamePhase, decrementTime, endGame]);

  // Level progression
  useEffect(() => {
    if (score > 0 && score % 10 === 0) {
      levelUp();
    }
  }, [score, levelUp]);

  const startNewRequest = (catsArray: Cat[]) => {
    const randomCat = catsArray[Math.floor(Math.random() * catsArray.length)];
    const randomNeed: 'food' | 'water' = Math.random() > 0.5 ? 'food' : 'water';
    
    setCats(prev => prev.map(cat => 
      cat.id === randomCat.id 
        ? { ...cat, currentNeed: randomNeed }
        : { ...cat, currentNeed: null }
    ));
    
    setCurrentRequest({ cat: randomCat, need: randomNeed });
    
    showSpeechBubble(
      randomCat,
      randomNeed === 'food' ? "Anne acıktım! 🍽️" : "Anne susadım! 💧",
      '#FFE4B5'
    );

    // Auto-clear request after 8 seconds
    setTimeout(() => {
      if (currentRequest?.cat.id === randomCat.id) {
        clearCurrentRequest();
        setTimeout(() => startNewRequest(catsArray), 1000);
      }
    }, 8000);
  };

  const clearCurrentRequest = () => {
    setCats(prev => prev.map(cat => ({ ...cat, currentNeed: null })));
    setCurrentRequest(null);
  };

  const showSpeechBubble = (cat: Cat, text: string, color: string) => {
    const bubble: SpeechBubble = {
      id: `bubble_${Date.now()}`,
      x: cat.x + cat.width / 2,
      y: cat.y - 40,
      text,
      color,
      timestamp: Date.now()
    };
    
    setSpeechBubbles(prev => [...prev, bubble]);
    
    setTimeout(() => {
      setSpeechBubbles(prev => prev.filter(b => b.id !== bubble.id));
    }, 3000);
  };

  const handleCorrectDelivery = (cat: Cat) => {
    incrementScore();
    playSuccess();
    showSpeechBubble(cat, cat.currentNeed === 'food' ? "Hmm... Çok güzeldi!" : "Şap şap... oh be anne!", '#90EE90');
    clearCurrentRequest();
    
    setTimeout(() => {
      if (gamePhase === 'playing') {
        startNewRequest(cats);
      }
    }, 2000);
  };

  const handleWrongDelivery = (cat: Cat) => {
    playHit();
    showSpeechBubble(cat, "Bu değil anne! 😾", '#FFB6C1');
  };

  // Event handlers
  const getEventPos = (e: MouseEvent | Touch): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const isPointInRect = (point: { x: number; y: number }, rect: { x: number; y: number; width: number; height: number }) => {
    return point.x >= rect.x && 
           point.x <= rect.x + rect.width && 
           point.y >= rect.y && 
           point.y <= rect.y + rect.height;
  };

  const handleStart = (e: MouseEvent | Touch) => {
    if (gamePhase !== 'playing') return;
    
    const pos = getEventPos(e);
    
    for (let item of items) {
      if (isPointInRect(pos, item)) {
        setDraggedItem(item);
        setItems(prev => prev.map(i => 
          i.id === item.id ? { ...i, isDragging: true } : i
        ));
        break;
      }
    }
  };

  const handleMove = (e: MouseEvent | Touch) => {
    if (draggedItem) {
      const pos = getEventPos(e);
      setItems(prev => prev.map(item => 
        item.id === draggedItem.id 
          ? { 
              ...item, 
              x: pos.x - item.width / 2, 
              y: pos.y - item.height / 2 
            }
          : item
      ));
    }
  };

  const handleEnd = (e: MouseEvent | Touch) => {
    if (!draggedItem || gamePhase !== 'playing') return;
    
    const pos = getEventPos(e);
    let delivered = false;

    // Check if dropped on a cat
    for (let cat of cats) {
      if (isPointInRect(pos, cat) && cat.currentNeed) {
        if (draggedItem.type === cat.currentNeed) {
          handleCorrectDelivery(cat);
          delivered = true;
        } else {
          handleWrongDelivery(cat);
          delivered = true;
        }
        break;
      }
    }

    // Return item to original position
    setItems(prev => prev.map(item => 
      item.id === draggedItem.id 
        ? { 
            ...item, 
            x: item.originalX, 
            y: item.originalY, 
            isDragging: false 
          }
        : item
    ));
    
    setDraggedItem(null);
  };

  // Mouse events
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseDown = (e: MouseEvent) => handleStart(e);
    const handleMouseMove = (e: MouseEvent) => handleMove(e);
    const handleMouseUp = (e: MouseEvent) => handleEnd(e);

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggedItem, items, cats, gamePhase]);

  // Touch events
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      handleStart(e.touches[0]);
    };
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      handleMove(e.touches[0]);
    };
    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      handleEnd(e.changedTouches[0]);
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [draggedItem, items, cats, gamePhase]);

  // Render game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    ctx.fillStyle = '#f4e4bc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw cats
    cats.forEach(cat => {
      ctx.fillStyle = cat.color;
      ctx.fillRect(cat.x, cat.y, cat.width, cat.height);
      
      // Draw cat eyes
      ctx.fillStyle = 'white';
      ctx.fillRect(cat.x + 15, cat.y + 20, 15, 15);
      ctx.fillRect(cat.x + 50, cat.y + 20, 15, 15);
      
      ctx.fillStyle = 'black';
      ctx.fillRect(cat.x + 20, cat.y + 25, 5, 5);
      ctx.fillRect(cat.x + 55, cat.y + 25, 5, 5);
      
      // Draw cat ears
      ctx.fillStyle = cat.color;
      ctx.beginPath();
      ctx.moveTo(cat.x + 10, cat.y);
      ctx.lineTo(cat.x + 25, cat.y - 15);
      ctx.lineTo(cat.x + 30, cat.y);
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(cat.x + 50, cat.y);
      ctx.lineTo(cat.x + 55, cat.y - 15);
      ctx.lineTo(cat.x + 70, cat.y);
      ctx.fill();

      // Draw name
      ctx.fillStyle = 'black';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(cat.name, cat.x + cat.width / 2, cat.y + cat.height + 20);

      // Draw need indicator
      if (cat.currentNeed) {
        ctx.fillStyle = cat.currentNeed === 'food' ? '#8B4513' : '#4169E1';
        ctx.beginPath();
        ctx.arc(cat.x + cat.width - 10, cat.y + 10, 8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(cat.currentNeed === 'food' ? '🍽' : '💧', cat.x + cat.width - 10, cat.y + 15);
      }
    });

    // Draw items
    items.forEach(item => {
      ctx.fillStyle = item.color;
      if (item.isDragging) {
        ctx.globalAlpha = 0.8;
        ctx.save();
        ctx.scale(1.1, 1.1);
      }
      
      ctx.fillRect(item.x, item.y, item.width, item.height);
      
      // Draw item icon
      ctx.fillStyle = 'white';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        item.type === 'food' ? '🍽️' : '💧',
        item.x + item.width / 2,
        item.y + item.height / 2 + 7
      );
      
      if (item.isDragging) {
        ctx.restore();
        ctx.globalAlpha = 1;
      }
    });

    // Draw speech bubbles (handled by CSS overlay for better styling)
  }, [cats, items, speechBubbles]);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        width={400}
        height={700}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        style={{ imageRendering: 'pixelated' }}
      />
      
      {/* Speech bubbles overlay */}
      {speechBubbles.map(bubble => (
        <div
          key={bubble.id}
          className="absolute bg-white border-2 border-gray-800 rounded-2xl p-2 text-xs font-bold z-40 pointer-events-none animate-bounce"
          style={{
            left: `${(bubble.x / 400) * 100}%`,
            top: `${(bubble.y / 700) * 100}%`,
            transform: 'translate(-50%, -100%)',
            backgroundColor: bubble.color
          }}
        >
          {bubble.text}
          <div 
            className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0"
            style={{
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid #333'
            }}
          />
          <div 
            className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 -mt-1"
            style={{
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: `4px solid ${bubble.color}`
            }}
          />
        </div>
      ))}
    </div>
  );
}
