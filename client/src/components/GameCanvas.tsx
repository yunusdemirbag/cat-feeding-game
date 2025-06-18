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
  currentNeed: "food" | "water" | null;
  needTimeout?: number;
}

interface Item {
  id:string;
  type: "food" | "water";
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
  needType?: "food" | "water" | null;
}

interface GameCanvasProps {
  onScoreChange: () => void;
  onTimeBonus: (seconds: number) => void;
  currentTime: number;
  onGameEnd: () => void;
}

export function GameCanvas({
  onScoreChange,
  onTimeBonus,
  currentTime,
  onGameEnd,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    score,
    level,
    gamePhase,
    endGame,
    levelUp,
  } = useCatGame();

  const { playHit, playSuccess } = useAudio();

  const [cats, setCats] = useState<Cat[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [draggedItem, setDraggedItem] = useState<Item | null>(null);
  const [speechBubbles, setSpeechBubbles] = useState<SpeechBubble[]>([]);
  const [images, setImages] = useState<{ [key: string]: HTMLImageElement }>({});
  const [imagesLoaded, setImagesLoaded] = useState(false);

  useEffect(() => {
    const imageUrls = {
      misa: "/misa.png",
      pars: "/pars.png",
      food: "/mama.png",
      water: "/su.png",
      woman: "/af.png",
      room: "/oda.svg",
    };

    let loadedCount = 0;
    const totalImages = Object.keys(imageUrls).length;
    const loadedImages: { [key: string]: HTMLImageElement } = {};

    Object.entries(imageUrls).forEach(([key, url]) => {
      const img = new Image();
      img.onload = () => {
        loadedImages[key] = img;
        loadedCount++;
        if (loadedCount === totalImages) {
          setImages(loadedImages);
          setImagesLoaded(true;
        }
      };
      img.src = url;
    });
  }, []);

  useEffect(() => {
    if (gamePhase === "playing") {
      const initialCats: Cat[] = [
        { id: "misa", name: "Mişa", x: 50, y: 380, width: 70, height: 70, color: "#666", currentNeed: null },
        { id: "pars", name: "Pars", x: 150, y: 500, width: 70, height: 70, color: "#DAA520", currentNeed: null },
      ];
      const initialItems: Item[] = [
        { id: "food", type: "food", x: 40, y: 620, width: 60, height: 60, color: "#8B4513", originalX: 40, originalY: 620, isDragging: false },
        { id: "water", type: "water", x: 120, y: 620, width: 60, height: 60, color: "#4169E1", originalX: 120, originalY: 620, isDragging: false },
      ];
      setCats(initialCats);
      setItems(initialItems);
    }
  }, [gamePhase]);

  // --- YENİ: Oyun başlangıcını ve döngüsünü yöneten ana mantık ---
  useEffect(() => {
    if (gamePhase !== 'playing') return;

    // --- 1. Planlı Başlangıç Sekansı ---
    // Oyun başlar başlamaz 1.5 saniye sonra ilk istek gelsin.
    const initialRequestTimeout = setTimeout(() => {
        setCats(prevCats => {
            const availableCats = prevCats.filter(c => !c.currentNeed);
            if (availableCats.length > 0) {
                const firstCat = availableCats[Math.floor(Math.random() * availableCats.length)];
                generateNewRequest(firstCat);
            }
            return prevCats; // Durumu değiştirmese de döndürmek gerekir.
        });
    }, 1500);

    // 10 saniye sonra iki kedi birden farklı şeyler istesin.
    const doubleRequestTimeout = setTimeout(() => {
        setCats(prevCats => {
            const availableCats = prevCats.filter(c => !c.currentNeed);
            let firstNeed: "food" | "water" = Math.random() > 0.5 ? "food" : "water";

            availableCats.forEach(cat => {
                generateNewRequest(cat, firstNeed);
                // Bir sonraki kedi için ihtiyacı değiştir.
                firstNeed = firstNeed === 'food' ? 'water' : 'food';
            });
            return prevCats;
        });
    }, 10000);

    // --- 2. Rastgele Devam Eden İstekler ---
    // Planlı başlangıçtan sonra devreye giren rastgele istek döngüsü.
    const randomRequestInterval = setInterval(() => {
        setCats(prevCats => {
            const maxConcurrentRequests = Math.min(2, Math.floor(1 + level / 2));
            const activeRequests = prevCats.filter(c => c.currentNeed).length;
            if (activeRequests >= maxConcurrentRequests) return prevCats;

            const availableCats = prevCats.filter(c => !c.currentNeed);
            if (availableCats.length > 0) {
                const catToRequest = availableCats[Math.floor(Math.random() * availableCats.length)];
                generateNewRequest(catToRequest);
            }
            return prevCats;
        });
    }, Math.max(2000, 5000 - level * 250));

    // --- 3. Zaman Aşımı Kontrolcüsü ---
    const timeoutChecker = setInterval(() => {
        setCats(prevCats => prevCats.map(cat => {
            if (cat.currentNeed && cat.needTimeout && Date.now() > cat.needTimeout) {
                return { ...cat, currentNeed: null, needTimeout: undefined };
            }
            return cat;
        }));
    }, 1000);

    // Temizlik fonksiyonu: Component kaldırıldığında tüm zamanlayıcıları temizle.
    return () => {
      clearTimeout(initialRequestTimeout);
      clearTimeout(doubleRequestTimeout);
      clearInterval(randomRequestInterval);
      clearInterval(timeoutChecker);
    };
  }, [gamePhase, level]); // Bağımlılıkları azalttık, artık 'cats' değişiminde tekrar çalışmayacak.


  useEffect(() => {
    if (currentTime <= 0 && gamePhase === "playing") {
      endGame();
      onGameEnd();
    }
  }, [currentTime, gamePhase, endGame, onGameEnd]);

  useEffect(() => {
    if (score > 0 && score % 8 === 0) {
      levelUp();
    }
  }, [score, levelUp]);

  // --- GÜNCELLENDİ: İsteğe bağlı olarak belirli bir ihtiyacı zorla atayabilir ---
  const generateNewRequest = (catToRequest: Cat, forceNeed?: "food" | "water") => {
    const catPositions = [
        { x: 90, y: 220 }, { x: 140, y: 220 }, { x: 240, y: 260 },
        { x: 290, y: 260 }, { x: 340, y: 260 }, { x: 60, y: 480 },
        { x: 150, y: 520 }, { x: 80, y: 440 },
    ];
    const newPosition = catPositions[Math.floor(Math.random() * catPositions.length)];
    const randomNeed: "food" | "water" = forceNeed || (Math.random() > 0.5 ? "food" : "water");
    const requestDuration = Math.max(8, 20 - level);

    const updatedCatState = {
        currentNeed: randomNeed,
        x: newPosition.x,
        y: newPosition.y,
        needTimeout: Date.now() + requestDuration * 1000,
    };

    showSpeechBubble(
        {...catToRequest, ...updatedCatState},
        getCatMessage(catToRequest, randomNeed),
        "#FFE4B5",
        randomNeed
    );
    setTimeout(() => showWomanReaction(catToRequest, randomNeed), 1000);

    setCats(prev =>
      prev.map(cat => cat.id === catToRequest.id ? { ...cat, ...updatedCatState } : cat)
    );
  };

  const getCatMessage = (cat: Cat, need: "food" | "water") => {
    if (cat.id === "misa") {
      const messages = need === "food" ? ["Anneciğim, karnım acıktı 🥺", "Biraz mama alabilir miyim?", "Miyav.. Acıktım...", "Anne yemek! Lütfen!"] : ["Anne, dilim damağım kurudu 💧", "Su verebilir misin?", "Susadım anneciğim...", "Birazcık su lütfen?"];
      return messages[Math.floor(Math.random() * messages.length)];
    } else {
      const messages = need === "food" ? ["ANNE! AÇIM! YEMEK NEREDE? 😤", "Açlıktan öleceğim, çabuk ol!", "YEMEK! YEMEK! YEMEK!", "O mama buraya gelecek!"] : ["ANNE! SUSADIM! 💧", "Çöl gibi oldum, su getir!", "SUUUUUUU!", "Hemen su istiyorum! Hemen!"];
      return messages[Math.floor(Math.random() * messages.length)];
    }
  };

  const showWomanReaction = (cat: Cat, need: "food" | "water") => {
      let normalReactions: string[] = [];

      if (cat.id === 'pars') {
        normalReactions = ["Tamam oğlum, hemen getiriyorum!", "Aç mı kalmış benim aslan oğlum?", "Oğlum, Parsss, yapma annem!", `Yine mi acıktın yakışıklım? Hemen ${need === 'food' ? 'mamanı' : 'suyunu'} veriyorum.`, "Pars! Sabret, geliyor!"];
      } else if (cat.id === 'misa') {
        normalReactions = ["Mişa, kızımmm, tamam.", "Geliyor prensesimin maması.", `Güzel kızım benim, susadın mı?`, "Hemen bakıyorum Mişa'ma.", "Tabii ki kızım, hemen."];
      }

      const complaintReactions = [ "Of yine mi acıktınız!", "Daha yeni yemedin mi sen?", "Biraz da kendiniz alın şuradan!", "Afra anne yoruldu ama!", "Yetişemiyorum size yahu!" ];
      const reactionList = Math.random() < 0.8 ? normalReactions : complaintReactions;
      const text = reactionList[Math.floor(Math.random() * reactionList.length)];

      const bubble: SpeechBubble = { id: `woman_bubble_${Date.now()}`, x: 240 + (135/2), y: 360, text, color: "#FFE4E1", timestamp: Date.now() };
      setSpeechBubbles((prev) => [...prev, bubble]);
      setTimeout(() => setSpeechBubbles((prev) => prev.filter((b) => b.id !== bubble.id)), 3000);
  };

  const showSpeechBubble = (cat: Cat, text: string, color: string, needType?: "food" | "water" | null) => {
    const bubbleX = Math.max(20, Math.min(cat.x + cat.width / 2, 350));
    const bubble: SpeechBubble = { id: `bubble_${Date.now()}`, x: bubbleX, y: cat.y - 50, text, color, timestamp: Date.now(), needType: needType || null };
    setSpeechBubbles((prev) => [...prev, bubble]);
    setTimeout(() => setSpeechBubbles((prev) => prev.filter((b) => b.id !== bubble.id)), 3000);
  };

  const handleCorrectDelivery = (cat: Cat) => {
    onScoreChange();
    playSuccess();
    const bonusTime = Math.max(5, 12 - level);
    onTimeBonus(bonusTime);
    setCats(prev => prev.map(c => c.id === cat.id ? {...c, currentNeed: null, needTimeout: undefined} : c));
    const happyReactions = cat.id === 'misa' ? ["Teşekkürler anne! En iyisi sensin ❤️", "Harikaydı! Ellerine sağlık!"] : ["HEH ŞÖYLE! Mükemmel! 🎉", "Sonunda! Bu harikaydı!"];
    showSpeechBubble(cat, happyReactions[Math.floor(Math.random()*happyReactions.length)], "#90EE90", null);
  };

  const handleWrongDelivery = (cat: Cat) => {
    playHit();
    const wrongReactions = cat.id === 'misa' ? ["Ama ben onu istememiştim ki... 😔", "Yanlış oldu anneciğim..."] : ["BU DEĞİL! DİĞERİ! 😠", "Anne! Dikkatini ver!"];
    showSpeechBubble(cat, wrongReactions[Math.floor(Math.random()*wrongReactions.length)], "#FFB6C1", null);
  };

  const getEventPos = (e: MouseEvent | Touch): { x: number; y: number } => {
    const canvas = canvasRef.current; if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const isPointInRect = (point: { x: number; y: number }, rect: { x: number; y: number; width: number; height: number }) => {
    return (point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height);
  };

  const handleStart = (e: MouseEvent | Touch) => {
    if (gamePhase !== "playing") return;
    const pos = getEventPos(e);
    for (let item of items) {
      if (isPointInRect(pos, item)) {
        setDraggedItem(item);
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isDragging: true } : i)));
        break;
      }
    }
  };

  const handleMove = (e: MouseEvent | Touch) => {
    if (draggedItem) {
      const pos = getEventPos(e);
      setDraggedItem({ ...draggedItem, x: pos.x - draggedItem.width / 2, y: pos.y - draggedItem.height / 2 });
    }
  };

  const handleEnd = (e: MouseEvent | Touch) => {
    if (!draggedItem || gamePhase !== "playing") return;
    let delivered = false;
    for (let cat of cats) {
      if (isPointInRect(draggedItem, cat)) {
        if (cat.currentNeed && draggedItem.type === cat.currentNeed) {
          handleCorrectDelivery(cat);
        } else {
          handleWrongDelivery(cat);
        }
        delivered = true;
        break;
      }
    }
    setItems((prev) => prev.map((item) => item.id === draggedItem.id ? { ...item, x: item.originalX, y: item.originalY, isDragging: false } : item));
    setDraggedItem(null);
  };

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const handleMouseDown = (e: MouseEvent) => handleStart(e);
    const handleMouseMove = (e: MouseEvent) => { if(draggedItem) handleMove(e); };
    const handleMouseUp = (e: MouseEvent) => handleEnd(e);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mousedown", handleMouseDown);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mousedown", handleMouseDown);
    };
  }, [draggedItem, items, cats, gamePhase]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const handleTouchStart = (e: TouchEvent) => { e.preventDefault(); handleStart(e.touches[0]); };
    const handleTouchMove = (e: TouchEvent) => { e.preventDefault(); if(draggedItem) handleMove(e.touches[0]); };
    const handleTouchEnd = (e: TouchEvent) => { e.preventDefault(); handleEnd(e.changedTouches[0]); };
    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: false });
    return () => {
      canvas.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [draggedItem, items, cats, gamePhase]);

  useEffect(() => {
    if (!imagesLoaded) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (images.room) ctx.drawImage(images.room, 0, 0, canvas.width, canvas.height);

      cats.forEach((cat) => {
        const catImage = images[cat.id];
        if (catImage) ctx.drawImage(catImage, cat.x, cat.y, cat.width, cat.height);
        ctx.fillStyle = "black"; ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.fillText(cat.name, cat.x + cat.width / 2, cat.y + cat.height + 20);
        if (cat.currentNeed) {
          const bounce = Math.sin(Date.now() * 0.005) * 3;
          ctx.fillStyle = cat.currentNeed === "food" ? "#FF6B6B" : "#4ECDC4";
          ctx.beginPath(); ctx.arc(cat.x + cat.width - 15, cat.y + 15 + bounce, 14, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = "#FFF"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(cat.x + cat.width - 15, cat.y + 15 + bounce, 14, 0, Math.PI * 2); ctx.stroke();
          ctx.font = "bold 18px Arial";
          const emoji = cat.currentNeed === "food" ? "🍽" : "💧";
          ctx.strokeText(emoji, cat.x + cat.width - 15, cat.y + 24 + bounce);
          ctx.fillText(emoji, cat.x + cat.width - 15, cat.y + 24 + bounce);
        }
      });

      const allItems = [...items];
      if (draggedItem) allItems.push(draggedItem);

      allItems.forEach((item) => {
          ctx.save();
          if (item.isDragging) {
              ctx.globalAlpha = 0.8;
              ctx.scale(1.1, 1.1);
              ctx.translate(-(item.width*0.05), -(item.height*0.05));
          }
          const itemImage = images[item.type];
          if (itemImage) ctx.drawImage(itemImage, item.x, item.y, item.width, item.height);
          ctx.restore();
      });

      if (images.woman) {
        const womanWidth = 135;
        const womanHeight = 180;
        const womanX = 240;
        const womanY = 370;
        ctx.drawImage(images.woman, womanX, womanY, womanWidth, womanHeight);
        ctx.fillStyle = "black";
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Afra", womanX + womanWidth / 2, womanY + womanHeight + 20);
      }

      if (gamePhase === "playing") requestAnimationFrame(animate);
    };

    animate();
  }, [cats, items, draggedItem, images, imagesLoaded, gamePhase]);

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} width={400} height={700} className="w-full h-full cursor-grab active:cursor-grabbing" style={{ imageRendering: "pixelated" }} />
      {speechBubbles.map((bubble) => (
        <div key={bubble.id} className="absolute bg-white border-2 border-gray-800 rounded-2xl p-2 text-xs font-bold z-40 pointer-events-none animate-bounce flex items-center gap-1"
          style={{
            left: `${(bubble.x / 400) * 100}%`,
            top: `${(bubble.y / 700) * 100}%`,
            transform: "translate(-50%, -100%)",
            backgroundColor: bubble.color,
          }}>
          {bubble.needType && (
            <div className="w-6 h-6 flex-shrink-0">
              <img src={bubble.needType === 'food' ? '/mama.png' : '/su.png'} alt={bubble.needType} className="w-full h-full object-contain" style={{ imageRendering: "pixelated" }} />
            </div>
          )}
          <span>{bubble.text}</span>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0" style={{ borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "6px solid #333" }} />
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 -mt-1" style={{ borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderTop: `4px solid ${bubble.color}` }} />
        </div>
      ))}
    </div>
  );
}