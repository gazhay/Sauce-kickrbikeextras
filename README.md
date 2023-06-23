# Kickr Bike Extras mod for Sauce4Zwift

Requires

1. [Sauce4Zwift](https://github.com/SauceLLC/sauce4zwift)
2. Device with bluetooth capability that is not the same device as zwift is run on.


# State
This is nothing more than a proof of concept. It is pretty janky and needs a lot of work to be a dependable mod.

# How to

1. Install into SauceMods folder in your $HOME/Documents/ directory.
2. (re)start Sauce
3. Start zwift as usual
4. Navigate your 2nd device (phone, tablet, 2nd pc) to https://<hostname>:1081/ (NOTE: s in https is important)
5. If you get a warning about the page not being secure (and you will) choose to proceed anyway. (This is because we *have* to use self signed certificates and this will fail security checks.) [In chrome you have to click "ADVANCED" followed by the link "Go to <hostname> (unsafe)"]
6. Once zwift has connected to the bike and you are in the main menu, return to the mod page and click "Connect"
7. This step routinely fails, keep clicking connect and selecting your Kickr Bike, it will eventually connect.
8. When it connects it will show the current gears in the mod
9. Open the "Kick Display" window in sauce and once you are in game sauce will display your gearing.
10. The mod page must stay active on the sending device and awake. I usually do this on android by hitting the button which brings up recent apps, clicking the logo of the app at the top and choosing "Split screen" (or "split top") and then selecting zwift companion as the 2nd app. This will keep both apps "live". [I do try to establish a wakelock, but it rarely seems to work]

# How it works

The page run on the 2nd device connects to the bike, reads the status messages and sends them to your own athlete data stream in Sauce. 

The fields KICKRgear will contain "cr" and "gr" fields - Chain ring (front) and gear ring (rear)
There should also be additional fields KICKRbrake with "side", "down" and "latch" which should trigger on brake lever action.
(In sauce the 2s update causes a bit of latency here)

Lastly there is a KICKRpower field which also sends the raw W value being sent from the bike.

You should be able to access all these fields with the mod active and use them as you want.
