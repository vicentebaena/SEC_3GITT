# SEC 3GITT

Educational web app for exploring digital building blocks used in communications.

The app includes a visual CORDIC lab with:

- Rotation mode and vectoring mode.
- Interactive controls with persistent contextual help.
- Geometric visualization of the iterations and angle-steps view.
- Internal register trace for `x`, `y`, `z`, and decision `d_i`.
- Error-vs-iterations plot.
- Teaching-oriented VHDL fragment parameterized by the selected configuration.

It also includes an OFDM lab with:

- Controls for `NFFT`, occupied carriers, sample rate, cyclic prefix, constellation, SNR, and Hermitian symmetry.
- Frequency view with the sinc curves of the occupied subcarriers and spacing `Δf`.
- Time view of the complex OFDM symbol with real part, imaginary part, and cyclic prefix.
- Received-constellation scatterplot with noise and ideal references.
- Raw transfer-rate calculation.

It also includes a DDS lab with:

- Controls for clock frequency, phase increment, accumulator width, phase truncation, and cosine-ROM word width.
- Datapath diagram for `input -> accumulator -> quantizer -> cosine ROM -> output`, showing current bus values.
- Time-domain cosine output view, limited to a readable number of periods.
- Coherent FFT spectrum view over exact accumulator periods to inspect quantization and phase-truncation spurs.
- Teaching-oriented VHDL for the parameterized DDS accumulator, quantizer, and cosine ROM.

Each lab includes a reset button to restore the default control values.

## Local Use

Open `index.html` directly in a browser.

## GitHub Pages

The app is published at:

https://vicentebaena.github.io/SEC_3GITT/

## License

Code is licensed under the MIT License.

Educational content, explanations, text, diagrams, and visualizations are licensed under Creative Commons Attribution 4.0 International (CC BY 4.0). Please cite Vicente Baena when reusing or adapting this material.
