import imageio.v3 as iio

filenames = [
    "frame_00_delay-0.05s.png",
    "frame_01_delay-0.05s.png",
    "frame_02_delay-0.05s.png",
    "frame_03_delay-0.05s.png",
    "frame_04_delay-0.05s.png",
    "frame_05_delay-0.05s.png",
    "frame_06_delay-0.05s.png",
    "frame_07_delay-0.05s.png",
    "frame_08_delay-0.05s.png",
    "frame_09_delay-0.05s.png",
    "frame_10_delay-0.05s.png",
    "frame_11_delay-0.05s.png"
]

images = [iio.imread(filename) for filename in filenames]
iio.imwrite("skippy.gif", images, duration=25, loop=0)
