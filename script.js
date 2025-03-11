document.getElementById('imageInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('loader').style.display = 'block';
            document.getElementById('image-container').innerHTML = '';
            
            setTimeout(() => {
                document.getElementById('loader').style.display = 'none';
                const img = document.createElement('img');
                img.src = e.target.result;
                img.style.opacity = '0';
                document.getElementById('image-container').appendChild(img);
                
                setTimeout(() => {
                    img.style.opacity = '1';
                }, 100);
            }, 10000);
        };
        reader.readAsDataURL(file);
    }
});
