const levelButtons = document.querySelectorAll('.level-btn');

levelButtons.forEach(button => {
    button.addEventListener('click', function() {
        const selectedLevel = this.getAttribute('data-level');
        // Store selected level in local storage or pass it to the next page
        localStorage.setItem('selectedLevel', selectedLevel);
        window.location.href = 'car-selection.html';
    });
});
