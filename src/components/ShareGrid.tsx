import { useState } from "react";
import { Copy, Check, Share2 } from "lucide-react";

interface ShareGridProps {
  url: string;
  text: string;
}

type ChannelId =
  | "native"
  | "whatsapp"
  | "snapchat"
  | "facebook"
  | "messenger"
  | "copy";

interface Channel {
  id: ChannelId;
  label: string;
  color: string;
  icon: React.ReactNode;
  action?: (url: string, text: string) => void;
  external?: boolean;
  href?: (url: string, text: string) => string;
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.359.101 11.892c0 2.096.549 4.142 1.595 5.945L0 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.581 0 11.94-5.359 11.943-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function SnapchatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M12.166.146h.286c2.573.007 5.023 1.378 6.448 3.566 1.063 1.622 1.082 3.741 1.082 5.59 0 .949-.022 1.798.214 2.693.107.41.324.789.598 1.106.291.336.668.595 1.063.772.36.162.741.272 1.128.343.198.036.398.063.598.087.32.039.643.07.962.124.42.071.842.196 1.198.43.248.161.46.386.564.667.14.38.084.82-.14 1.164-.214.324-.535.553-.87.717-.402.197-.84.32-1.273.42-.226.053-.453.1-.678.155-.124.03-.248.062-.37.1-.099.03-.196.067-.288.115-.142.074-.267.18-.347.32-.087.153-.113.335-.094.508.03.267.146.517.278.75.157.276.34.536.516.798.347.516.715 1.015 1.116 1.488.5.587 1.05 1.13 1.658 1.604.5.388 1.04.726 1.617.99.273.125.555.227.843.31.284.082.575.137.868.173.248.03.498.04.748.04.166 0 .333 0 .498.01.166.01.333.04.49.1.146.057.28.143.388.25.107.107.19.237.248.38.108.32.084.683-.04.994-.116.29-.31.543-.543.748-.267.234-.58.402-.906.53-.39.153-.798.25-1.207.32-.225.04-.45.07-.676.1-.166.02-.333.04-.498.07-.124.02-.248.05-.367.09-.107.04-.21.09-.298.16-.107.08-.19.19-.248.31-.07.15-.1.32-.1.48 0 .166.03.333.07.49.084.32.23.62.39.9.22.38.48.73.74 1.07.32.41.67.79 1.04 1.15.46.45.95.86 1.46 1.24.58.43 1.19.81 1.82 1.14.66.35 1.35.63 2.06.83.37.1.75.18 1.13.23.19.03.38.05.57.06.19.01.38.01.57.01.17 0 .34 0 .51-.02.17-.02.34-.05.5-.1.15-.05.29-.12.42-.21.12-.09.23-.2.32-.32.09-.13.16-.27.21-.42.05-.16.08-.32.1-.49.02-.17.03-.34.04-.51.01-.17.02-.34.04-.51.02-.17.05-.34.1-.5.05-.15.12-.29.21-.42.09-.12.2-.23.32-.32.13-.09.27-.16.42-.21.16-.05.33-.08.5-.1.17-.02.34-.03.51-.04.17-.01.34-.02.51-.04.17-.02.34-.05.5-.1.15-.05.29-.12.42-.21.12-.09.23-.2.32-.32.09-.13.16-.27.21-.42.05-.16.08-.32.1-.49.02-.17.03-.34.04-.51.01-.17.02-.34.04-.51.02-.17.05-.34.1-.5.05-.15.12-.29.21-.42.09-.12.2-.23.32-.32.13-.09.27-.16.42-.21.16-.05.33-.08.5-.1.17-.02.34-.03.51-.04.17-.01.34-.02.51-.04.17-.02.34-.05.5-.1.15-.05.29-.12.42-.21.12-.09.23-.2.32-.32.09-.13.16-.27.21-.42.05-.16.08-.32.1-.49.02-.17.03-.34.04-.51.01-.17.02-.34.04-.51.02-.17.05-.34.1-.5.05-.15.12-.29.21-.42.09-.12.2-.23.32-.32.13-.09.27-.16.42-.21.16-.05.33-.08.5-.1.17-.02.34-.03.51-.04.17-.01.34-.02.51-.04z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function MessengerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.653V24l4.088-2.242c1.092.301 2.246.464 3.443.464 6.627 0 12-4.973 12-11.111S18.627 0 12 0zm1.191 14.974l-3.056-3.253-5.963 3.253 6.554-6.964 3.131 3.253 5.926-3.253-6.592 6.964z" />
    </svg>
  );
}

const channels: Channel[] = [
  {
    id: "native",
    label: "Partager",
    color: "bg-charcoal-600 hover:bg-charcoal-500",
    icon: <Share2 className="w-6 h-6" />,
    action: async (url, text) => {
      if (navigator.share) {
        try {
          await navigator.share({ title: "Le Juste Chiffre", text, url });
        } catch {
          /* user cancelled */
        }
      }
    },
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    color: "bg-[#25D366] hover:bg-[#1fb855]",
    icon: <WhatsAppIcon />,
    external: true,
    href: (_url, text) =>
      `https://wa.me/?text=${encodeURIComponent(text)}`,
  },
  {
    id: "snapchat",
    label: "Snapchat",
    color: "bg-[#FFFC00] hover:bg-[#e6dc00]",
    icon: <SnapchatIcon />,
    external: true,
    href: (url) =>
      `https://www.snapchat.com/share?link=${encodeURIComponent(url)}`,
  },
  {
    id: "facebook",
    label: "Facebook",
    color: "bg-[#1877F2] hover:bg-[#1466d6]",
    icon: <FacebookIcon />,
    external: true,
    href: (url, text) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`,
  },
  {
    id: "messenger",
    label: "Messenger",
    color: "bg-gradient-to-br from-[#00B2FF] to-[#006AFF] hover:from-[#00a0e8] hover:to-[#0058cc]",
    icon: <MessengerIcon />,
    action: (url) => {
      window.location.href = `fb-messenger://share/?link=${encodeURIComponent(url)}`;
      setTimeout(() => {
        window.open(
          `https://www.facebook.com/dialog/send?link=${encodeURIComponent(url)}&app_id=0`,
          "_blank",
          "noopener,noreferrer"
        );
      }, 1500);
    },
  },
];

export default function ShareGrid({ url, text }: ShareGridProps) {
  const [copied, setCopied] = useState(false);
  const hasNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  const visibleChannels = hasNativeShare
    ? channels
    : channels.filter((c) => c.id !== "native");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleChannel = (channel: Channel) => {
    if (channel.id === "copy") {
      handleCopy();
      return;
    }
    if (channel.external && channel.href) {
      window.open(channel.href(url, text), "_blank", "noopener,noreferrer");
      return;
    }
    channel.action?.(url, text);
  };

  const textColor = (id: ChannelId) => {
    if (id === "snapchat") return "text-charcoal-900";
    return "text-white";
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {visibleChannels.map((channel) => (
          <button
            key={channel.id}
            onClick={() => handleChannel(channel)}
            className={`flex flex-col items-center gap-1.5 ${channel.color} ${textColor(channel.id)} rounded-2xl py-3 px-2 transition-all duration-200 hover:scale-[1.05] active:scale-[0.95]`}
            aria-label={channel.label}
          >
            {channel.icon}
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {channel.label}
            </span>
          </button>
        ))}

        {/* Copy link button */}
        <button
          onClick={handleCopy}
          className={`flex flex-col items-center gap-1.5 rounded-2xl py-3 px-2 transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] ${
            copied
              ? "bg-volt-500 text-charcoal-900"
              : "bg-charcoal-600 text-white hover:bg-charcoal-500"
          }`}
          aria-label="Copier le lien"
        >
          {copied ? (
            <Check className="w-6 h-6" />
          ) : (
            <Copy className="w-6 h-6" />
          )}
          <span className="text-[10px] font-bold uppercase tracking-wider">
            {copied ? "Copié !" : "Copier"}
          </span>
        </button>
      </div>
    </div>
  );
}
